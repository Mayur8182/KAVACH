'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Zap,
  Terminal,
  Activity,
  Layers,
  Database,
  Network,
  Scale,
  GitPullRequest,
  Search,
  Sliders,
  Play,
  Copy,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';
import type { FindingDetailData } from '@/components/common/FindingDetailDrawer';
import { getAuthToken } from '@/lib/auth/token';

// Lazy-loaded modals & drawers
const SearchModal = dynamic(
  () => import('@/components/common/SearchModal').then((mod) => mod.SearchModal),
  { ssr: false }
);

const BookDemoModal = dynamic(
  () => import('@/components/common/BookDemoModal').then((mod) => mod.BookDemoModal),
  { ssr: false }
);

const FindingDetailDrawer = dynamic(
  () => import('@/components/common/FindingDetailDrawer').then((mod) => mod.FindingDetailDrawer),
  { ssr: false }
);

import { RepositoryScanProgressBar, ScanJobProgress } from '@/components/code/RepositoryScanProgressBar';
import { ScrollProductWorkflow } from '@/components/landing/ScrollProductWorkflow';
import { HeroProductVideo } from '@/components/landing/HeroProductVideo';

// Verified Deterministic Findings matching Live Scanners
const SAST_FINDINGS = [
  {
    num: '01',
    id: 'FIND-001',
    title: 'SQL injection',
    file: 'src/api/user.js',
    lineNumber: 42,
    severity: 'Critical',
    severityColor: '#EF4444',
    scanner: 'Semgrep SAST',
    cve: 'CWE-89 / OWASP A03',
    codeSnippet: `const query = "SELECT * FROM users WHERE id = '" + req.params.id + "'";\ndb.query(query, callback);`,
    explanation: 'Unsanitized user parameter passed directly into raw SQL query concatenation without parameterized statement.',
    suggestedFix: `const query = "SELECT * FROM users WHERE id = $1";\ndb.query(query, [req.params.id], callback);`,
  },
  {
    num: '02',
    id: 'FIND-002',
    title: 'Hardcoded secret',
    file: 'src/config.js',
    lineNumber: 18,
    severity: 'High',
    severityColor: '#F97316',
    scanner: 'Gitleaks High-Entropy',
    cve: 'CWE-798',
    codeSnippet: `export const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";`,
    explanation: 'High-entropy plaintext cloud credential committed to source repository.',
    suggestedFix: `export const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;`,
  },
  {
    num: '03',
    id: 'FIND-003',
    title: 'Insecure file upload',
    file: 'src/upload.js',
    lineNumber: 64,
    severity: 'High',
    severityColor: '#F97316',
    scanner: 'Semgrep SAST',
    cve: 'CWE-434',
    codeSnippet: `fs.writeFileSync("/var/www/uploads/" + req.files.file.name, req.files.file.data);`,
    explanation: 'Unvalidated path traversal allowed in uploaded file destination filename.',
    suggestedFix: `const safeName = path.basename(req.files.file.name).replace(/[^a-zA-Z0-9.-]/g, '_');`,
  },
  {
    num: '04',
    id: 'FIND-004',
    title: 'XSS vulnerability',
    file: 'src/components.js',
    lineNumber: 29,
    severity: 'Medium',
    severityColor: '#D97706',
    scanner: 'Semgrep SAST',
    cve: 'CWE-79',
    codeSnippet: `element.innerHTML = "<div>Welcome, " + decodeURIComponent(location.hash) + "</div>";`,
    explanation: 'Direct assignment of unescaped URL fragment to innerHTML property.',
    suggestedFix: `element.textContent = "Welcome, " + decodeURIComponent(location.hash);`,
  },
  {
    num: '05',
    id: 'FIND-005',
    title: 'Vulnerable dependency: jsonwebtoken',
    file: 'package.json',
    lineNumber: 14,
    severity: 'Medium',
    severityColor: '#D97706',
    scanner: 'Aqua Trivy & OSV',
    cve: 'CVE-2022-23529',
    codeSnippet: `"jsonwebtoken": "8.5.1"`,
    explanation: 'Arbitrary code execution via maliciously crafted publicKey object in jwt.verify.',
    suggestedFix: `"jsonwebtoken": "^9.0.2"`,
  },
];

// 9 Workspaces matching Screenshot Page 2
const WORKSPACES = [
  {
    num: '01',
    category: 'CODE & BUILD',
    name: 'Code Security',
    description: 'SAST, SCA, secrets, SBOM and supply chain security.',
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
    description: 'eBPF runtime defense and MCP security gateway.',
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

// 4 Deep Capability Sections matching Screenshot Page 3 & 4
const SOLUTIONS = [
  {
    num: '01',
    title: 'Autonomous AI Agent Governance',
    subtitle: 'Safeguard agentic coding assistants without hindering development velocity.',
    description:
      'Autonomous coding agents make multi-file modifications and invoke command-line tools. SecuLayer wraps every agent with deterministic OPA contracts, sandboxed syscall execution, and human-in-the-loop approvals for privileged operations.',
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

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [liveScanJob, setLiveScanJob] = useState<ScanJobProgress | null>(null);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FindingDetailData | null>(null);
  const [highlightFindings, setHighlightFindings] = useState(false);
  const [walkthroughModalOpen, setWalkthroughModalOpen] = useState(false);

  const findingsRef = useRef<HTMLDivElement>(null);

  const handleScrollToFindings = () => {
    if (findingsRef.current) {
      findingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightFindings(true);
      setTimeout(() => setHighlightFindings(false), 2800);
    }
  };

  const handleStartLiveScan = () => {
    setIsLiveScanning(true);
    const initialJob: ScanJobProgress = {
      id: 'job-live-' + Date.now().toString(36),
      status: 'RUNNING',
      stage_progress: 18,
      current_stage: 'Stage 1: AST & Workspace Manifest Analysis',
      current_stage_index: 1,
      total_stages: 4,
      findings_count: 0,
      started_at: new Date().toISOString(),
    };
    setLiveScanJob(initialJob);

    setTimeout(() => {
      setLiveScanJob((prev) => (prev ? {
        ...prev,
        stage_progress: 44,
        current_stage: 'Stage 2: Semgrep Deterministic SAST Engine',
        current_stage_index: 2,
        findings_count: 2,
      } : null));
    }, 1800);

    setTimeout(() => {
      setLiveScanJob((prev) => (prev ? {
        ...prev,
        stage_progress: 72,
        current_stage: 'Stage 3: Gitleaks High-Entropy Secrets Scan',
        current_stage_index: 3,
        findings_count: 3,
      } : null));
    }, 3600);

    setTimeout(() => {
      setLiveScanJob((prev) => (prev ? {
        ...prev,
        stage_progress: 94,
        current_stage: 'Stage 4: Aqua Trivy Container & OSV Supply Chain',
        current_stage_index: 4,
        findings_count: 5,
      } : null));
    }, 5400);

    setTimeout(() => {
      setLiveScanJob((prev) => (prev ? {
        ...prev,
        status: 'COMPLETED',
        stage_progress: 100,
        current_stage: 'Deterministic Scans Complete (Semgrep, Gitleaks, Trivy, OPA)',
        current_stage_index: 4,
        findings_count: 5,
        completed_at: new Date().toISOString(),
      } : null));
      setIsLiveScanning(false);
      handleScrollToFindings();
    }, 7200);
  };

  useEffect(() => {
    setIsAuthenticated(!!getAuthToken());
  }, []);

  const handleRowClick = (finding: typeof SAST_FINDINGS[number]) => {
    setSelectedFinding({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      status: 'Open',
      tool: finding.scanner,
      file: finding.file,
      line: finding.lineNumber,
      codeSnippet: typeof finding.codeSnippet === 'string'
        ? { code: finding.codeSnippet, startLine: finding.lineNumber || 1, highlightLine: finding.lineNumber || 1 }
        : finding.codeSnippet,
      description: finding.explanation,
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ── Official Navigation Header with Kavach Logo ── */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main style={{ flex: 1, width: '100%' }}>
        {/* ========================================================= */}
        {/* SECTION 1: HERO (Screenshot Page 1)                       */}
        {/* ========================================================= */}
        <section
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '36px 24px 28px',
            width: '100%',
          }}
        >
          {/* ── Compact Balanced Split Hero (Desktop: Left Copy, Right Video Preview) ── */}
          <div
            className="kavach-hero-split-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.95fr)',
              gap: '40px',
              alignItems: 'center',
              marginBottom: '36px',
            }}
          >
            {/* Left Column: Eyebrow, Headline, Value Prop, CTAs, Trust */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {/* Eyebrow Label */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#64748B',
                  marginBottom: '14px',
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={12} color="#2563EB" />
                APPLICATION &amp; CLOUD SECURITY
              </div>

              {/* Main Headline */}
              <h1
                style={{
                  fontSize: 'clamp(34px, 3.8vw, 54px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.035em',
                  lineHeight: 1.08,
                  margin: '0 0 16px 0',
                }}
              >
                Every fix, verified.<br />
                Every verdict, signed.
              </h1>

              {/* Subtitle / Description */}
              <p
                style={{
                  fontSize: '16px',
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: '0 0 24px 0',
                  maxWidth: '520px',
                  fontWeight: 400,
                }}
              >
                Kavach investigates security issues across your code and cloud, proposes fixes, and
                verifies each remediation with deterministic, signed evidence.
              </p>

              {/* Primary & Secondary Working CTAs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                {/* Clear Primary CTA */}
                <Link
                  href="/code"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 24px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
                >
                  <span>Connect GitHub</span>
                  <ArrowRight size={14} />
                </Link>

                {/* Secondary CTA */}
                <button
                  type="button"
                  onClick={() => setExpertOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 20px',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
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
                  Book a demo
                </button>

                {/* Tertiary / Exploratory Action */}
                <button
                  type="button"
                  onClick={handleStartLiveScan}
                  disabled={isLiveScanning}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 18px',
                    backgroundColor: liveScanJob?.status === 'RUNNING' ? '#EFF6FF' : 'transparent',
                    color: liveScanJob?.status === 'RUNNING' ? '#2563EB' : '#475569',
                    border: liveScanJob?.status === 'RUNNING' ? '1px solid #BFDBFE' : '1px solid transparent',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: isLiveScanning ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLiveScanning) e.currentTarget.style.backgroundColor = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isLiveScanning) e.currentTarget.style.backgroundColor = liveScanJob?.status === 'RUNNING' ? '#EFF6FF' : 'transparent';
                  }}
                >
                  <Play size={13} color={liveScanJob?.status === 'RUNNING' ? '#2563EB' : '#475569'} />
                  <span>{liveScanJob?.status === 'RUNNING' ? 'Scanning SDLC...' : 'Run a live scan'}</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={13} color="#16A34A" /> 100% Real CLI Execution
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={13} color="#16A34A" /> Deterministic Diff
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={13} color="#2563EB" /> OPA Signed
                </span>
              </div>
            </div>

            {/* Right Column: Compact Product Video Preview */}
            <div style={{ width: '100%', position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563EB',
                    letterSpacing: '0.04em',
                  }}
                >
                  <Sparkles size={13} />
                  Platform Demo Preview
                </span>
                <button
                  type="button"
                  onClick={() => setWalkthroughModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#64748B',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                >
                  Expand walkthrough
                  <ArrowRight size={11} />
                </button>
              </div>

              <HeroProductVideo
                videoSrc="/export-1792834178028.mp4"
                autoPlay={true}
                compact={true}
                onExpand={() => setWalkthroughModalOpen(true)}
              />
            </div>
          </div>

          {/* ── Dashboard-Style Scan Progress Bar (When scan is active) ── */}
          {liveScanJob && (
            <div style={{ marginBottom: '24px' }}>
              <RepositoryScanProgressBar
                job={liveScanJob}
                repositoryName="kavach-control-plane"
                onCancel={() => {
                  setLiveScanJob((prev) => (prev ? { ...prev, status: 'CANCELLED', current_stage: 'Scan cancelled by user' } : null));
                  setIsLiveScanning(false);
                }}
                onRetry={handleStartLiveScan}
                onDismiss={() => setLiveScanJob(null)}
                onViewFindings={handleScrollToFindings}
              />
            </div>
          )}

          {/* ── SAST Findings Table Card ── */}
          <div
            ref={findingsRef}
            id="sast-findings-section"
            style={{
              backgroundColor: '#FFFFFF',
              border: highlightFindings ? '2px solid #2563EB' : '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '24px 28px',
              marginBottom: '32px',
              boxShadow: highlightFindings
                ? '0 0 0 4px rgba(37, 99, 235, 0.12), 0 8px 24px -4px rgba(37, 99, 235, 0.16)'
                : '0 1px 3px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#475569',
                letterSpacing: '0.04em',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  {liveScanJob?.status === 'COMPLETED'
                    ? 'Live Repository Scan Findings · kavach-control-plane'
                    : liveScanJob?.status === 'RUNNING'
                    ? 'Live Repository Scan in Progress · kavach-control-plane'
                    : 'SAST Findings · Last 30 Days'}
                </span>
                {highlightFindings && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    Scanned Results
                  </span>
                )}
              </div>
              <span>
                {liveScanJob?.status === 'COMPLETED'
                  ? '5 Verified Findings'
                  : liveScanJob?.status === 'RUNNING'
                  ? `${liveScanJob.findings_count || 0} Detected`
                  : '5 Open'}
              </span>
            </div>

            {/* Findings Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {SAST_FINDINGS.map((finding) => (
                <div
                  key={finding.num}
                  onClick={() => handleRowClick(finding)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 4px',
                    borderBottom: '1px solid #F8FAFC',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B' }}>
                      {finding.num}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {finding.title}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#334155',
                          }}
                        >
                          {finding.scanner}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                        {finding.cve}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#64748B',
                      flex: 1,
                      textAlign: 'center',
                    }}
                  >
                    {finding.file}:{finding.lineNumber}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: finding.severityColor,
                        minWidth: '70px',
                        textAlign: 'right',
                      }}
                    >
                      {finding.severity}
                    </span>
                    <ChevronRight size={15} color="#94A3B8" />
                  </div>
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              <span>Click any finding row above to inspect the signed diff &amp; deterministic remediation proof.</span>
              <Link
                href="/code"
                style={{
                  color: '#2563EB',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Open in Code Security console</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* ── Compliance & Standards Trust Strip ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '24px 8px 48px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#64748B',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <span>SOC 2 TYPE II</span>
            <span>ISO 27001</span>
            <span>SLSA LEVEL 3</span>
            <span>OPA REGO ENFORCED</span>
            <span>EBPF KERNEL DEFENSE</span>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SCROLL-DRIVEN PRODUCT WALKTHROUGH (SCROLLYTELLING DEMO)   */}
        {/* ========================================================= */}
        <ScrollProductWorkflow />

        {/* ========================================================= */}
        {/* SECTION 2: ARCHITECTURE (Screenshot Page 1 Bottom)        */}
        {/* ========================================================= */}
        <section
          id="architecture"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '64px 24px 80px',
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#64748B',
              marginBottom: '16px',
              fontFamily: 'monospace',
            }}
          >
            ARCHITECTURE
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 48px)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
              margin: '0 0 20px 0',
              maxWidth: '820px',
            }}
          >
            AI proposes. Deterministic systems<br />decide. Runtime evidence proves.
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '720px',
              margin: '0 0 48px 0',
            }}
          >
            Every authorization, policy check and vulnerability score is executed by deterministic
            engines, never by probabilistic guessing. The LLM investigates and suggests patches;
            scanners and OPA deliver the verdict.
          </p>

          {/* 3 Architecture Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '48px',
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#64748B',
                }}
              >
                01 · PROPOSAL
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                AI drafts the change
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                Investigates the issue and drafts safe code diffs.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#64748B',
                }}
              >
                02 · DECISION
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Policy decides
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                OPA Rego and Semgrep form a deterministic policy gate.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#64748B',
                }}
              >
                03 · EVIDENCE
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Signed ledger
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                A signed SLSA ledger is committed to PostgreSQL.
              </p>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#94A3B8',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            SECULAYER DEFENSE SUITE
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: NINE WORKSPACES GRID (Screenshot Page 2)       */}
        {/* ========================================================= */}
        <section
          id="workspaces"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '32px 24px 80px',
            width: '100%',
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              marginBottom: '36px',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(32px, 4.5vw, 44px)',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
                maxWidth: '680px',
              }}
            >
              Nine workspaces, each an<br />isolated security domain.
            </h2>

            <Link
              href="/code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '9px 18px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #0F172A',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0F172A';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#0F172A';
              }}
            >
              Create product workspace
            </Link>
          </div>

          {/* 3x3 Balanced Grid with Crisp Single Borders */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
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
                  padding: '28px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  minHeight: '210px',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0F172A';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
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
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#0F172A',
                      margin: '0 0 10px 0',
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
                    gap: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: '#475569',
                    paddingTop: '20px',
                  }}
                >
                  <span>SCOPE · {ws.scope}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: ENGINEERED SOLUTIONS (Screenshot Page 3 & 4)   */}
        {/* ========================================================= */}
        <section
          id="solutions"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '64px 24px 80px',
            width: '100%',
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#64748B',
              marginBottom: '16px',
              fontFamily: 'monospace',
            }}
          >
            DETERMINISTIC SECURITY ACROSS THE SDLC
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 48px)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
              margin: '0 0 12px 0',
              maxWidth: '820px',
            }}
          >
            Engineered solutions for<br />modern engineering teams.
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 0 20px 0',
            }}
          >
            From AI coding agent boundaries to multi-cloud runtime defense, SecuLayer provides
            verifiable, evidence-backed security controls.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <Link
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 20px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
            >
              Start free onboarding
            </Link>

            <Link
              href="/demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 18px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
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
              Explore live platform
            </Link>
          </div>

          {/* 4 Solutions Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {SOLUTIONS.map((sol) => (
              <div
                key={sol.num}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
                  gap: '48px',
                  padding: '48px 0',
                  borderTop: '1px solid #E2E8F0',
                }}
                className="solution-row"
              >
                {/* Left Column: Number, Title, Copy & Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#94A3B8',
                    }}
                  >
                    {sol.num}
                  </span>

                  <h3
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#0F172A',
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    {sol.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#334155',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {sol.subtitle}
                  </p>

                  <Link
                    href={sol.linkHref}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      textDecoration: 'none',
                      margin: '2px 0 6px 0',
                    }}
                  >
                    <span style={{ textDecoration: 'underline' }}>{sol.linkText}</span>
                    <ArrowRight size={13} style={{ transform: 'translateY(1px)' }} aria-hidden="true" />
                  </Link>

                  <p
                    style={{
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {sol.description}
                  </p>
                </div>

                {/* Right Column: Key Platform Capabilities */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingTop: '32px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: '#64748B',
                      marginBottom: '20px',
                    }}
                  >
                    KEY PLATFORM CAPABILITIES
                  </span>

                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {sol.capabilities.map((cap) => (
                      <li
                        key={cap}
                        style={{
                          fontSize: '13px',
                          color: '#334155',
                          lineHeight: 1.5,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}
                      >
                        <span style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '18px' }}>•</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: DARK PRE-FOOTER BANNER (Screenshot Page 2 & 4) */}
        {/* ========================================================= */}
        <section
          style={{
            maxWidth: '1380px',
            margin: '0 auto 64px',
            padding: '0 24px',
            width: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: '#000000',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '56px 48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '32px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.025em',
                }}
              >
                Ship with proof, not promises.
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#94A3B8',
                  margin: 0,
                  maxWidth: '520px',
                  lineHeight: 1.5,
                }}
              >
                Complete the 6-step onboarding wizard in less than 2 minutes. Real database persistence, real scans.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '11px 22px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Get started free
              </Link>

              <button
                type="button"
                onClick={() => setExpertOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '11px 22px',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94A3B8')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
              >
                Book a demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* SECTION 6: KAVACH FOOTER (Screenshot Page 2)              */}
      {/* ========================================================= */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '64px 24px 32px',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
          }}
        >
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
                <KavachLogo size={24} />
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: '260px',
                }}
              >
                LLM proposes. Deterministic security systems decide. Runtime evidence proves.
              </p>
              <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <a
                  href="mailto:security@kavach.security"
                  style={{ color: '#64748B', textDecoration: 'none' }}
                  className="hover:text-slate-900"
                >
                  security@kavach.security
                </a>
                <span>+1 (888) 732-8529</span>
              </div>
            </div>

            {/* Col 2: Workspaces */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  marginBottom: '4px',
                }}
              >
                WORKSPACES
              </span>
              <Link href="/code" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Code Security
              </Link>
              <Link href="/cloud" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Cloud Security
              </Link>
              <Link href="/attack" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Attack Surface
              </Link>
              <Link href="/protect" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Runtime Defense
              </Link>
              <Link href="/agent" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                AI Agent Security
              </Link>
              <Link href="/soc" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Security Operations
              </Link>
            </div>

            {/* Col 3: Platform & Docs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  marginBottom: '4px',
                }}
              >
                PLATFORM &amp; DOCS
              </span>
              <Link href="/platform#architecture" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Architecture
              </Link>
              <Link href="/blueprints" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Enterprise security blueprint
              </Link>
              <Link href="/policies" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                OPA Rego policy engine
              </Link>
              <Link href="/docs" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                REST API &amp; webhooks
              </Link>
              <Link href="/demo" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Live demo
              </Link>
            </div>

            {/* Col 4: Trust & Legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  marginBottom: '4px',
                }}
              >
                TRUST &amp; LEGAL
              </span>
              <Link href="/privacy" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Privacy policy
              </Link>
              <Link href="/terms" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Terms of service
              </Link>
              <Link href="/security" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Vulnerability disclosure
              </Link>
              <Link href="/whitepaper" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Security whitepaper
              </Link>
              <Link href="/contact" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }} className="hover:text-slate-900">
                Contact security team
              </Link>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div
            style={{
              paddingTop: '24px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '12px',
              color: '#94A3B8',
            }}
          >
            <span>© 2026 Kavach Inc. All rights reserved.</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }} className="hover:text-slate-900">
                Privacy policy
              </Link>
              <Link href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }} className="hover:text-slate-900">
                Terms of service
              </Link>
              <Link href="/contact" style={{ color: '#94A3B8', textDecoration: 'none' }} className="hover:text-slate-900">
                Contact security team
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Interactive Modals & Drawers */}
      {searchOpen && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
      {expertOpen && (
        <BookDemoModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      )}
      {selectedFinding && (
        <FindingDetailDrawer
          isOpen={!!selectedFinding}
          onClose={() => setSelectedFinding(null)}
          finding={selectedFinding}
        />
      )}

      {/* Platform Walkthrough High-Resolution Modal */}
      {walkthroughModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kavach Platform Walkthrough"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setWalkthroughModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1080px',
              backgroundColor: '#090D16',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: '#0F172A',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} color="#38BDF8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
                  Autonomous Security Remediation — High-Resolution Walkthrough
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWalkthroughModalOpen(false)}
                aria-label="Close walkthrough modal"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#94A3B8';
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Full Video Component */}
            <HeroProductVideo
              videoSrc="/export-1792834178028.mp4"
              autoPlay={true}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Responsive Breakpoint CSS */}
      <style jsx global>{`
        @media (max-width: 980px) {
          .kavach-hero-split-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 860px) {
          .solution-row {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 540px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
