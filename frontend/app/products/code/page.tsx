'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Code2,
  Key,
  ShieldAlert,
  Sparkles,
  GitBranch,
  FolderGit2,
  GitPullRequest,
  Terminal,
  Settings,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle2,
  FileCode,
  SlidersHorizontal,
  Clock,
  Wrench,
  Play,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { FindingDetailDrawer, FindingDetailData } from '@/components/common/FindingDetailDrawer';
import { SecuLayerDashboardCard } from '@/components/dashboard/SecuLayerDashboardCard';

export default function SecuLayerCodeProductPage() {
  const router = useRouter();

  // Modals & Drawers
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FindingDetailData | null>(null);

  // Live Workspace Controls
  const [selectedRepo, setSelectedRepo] = useState('frontend-app');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days');
  const [workspaceSidebarTab, setWorkspaceSidebarTab] = useState('Repositories');
  const [findingsCategory, setFindingsCategory] = useState<'SAST' | 'SCA' | 'Secrets' | 'Dependencies'>('SAST');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [langFilter, setLangFilter] = useState('All');

  // Bottom Tabs
  const [activeBottomTab, setActiveBottomTab] = useState<'capabilities' | 'integrations' | 'languages' | 'resources'>('capabilities');

  // Real SAST findings dataset matching screenshot
  const [sastFindings, setSastFindings] = useState<FindingDetailData[]>([
    {
      id: 'SAST-1',
      title: 'SQL Injection',
      severity: 'Critical',
      file: 'src/api/user.js',
      line: 32,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 29, 2026, 11:42 AM',
      description: 'Dynamic raw query string interpolation via user parameters without sanitization.',
      codeSnippet: {
        code: `// src/api/user.js:32\nexport async function getUser(req, res) {\n  const id = req.query.id;\n  const query = "SELECT * FROM users WHERE id = '" + id + "'"; // VULNERABILITY\n  return await db.query(query);\n}`,
        startLine: 29,
        highlightLine: 32,
      },
      remediation: {
        summary: 'Use parameterized queries with prepared statement bindings.',
        diffSnippet: `- const query = "SELECT * FROM users WHERE id = '" + id + "'";\n+ const query = "SELECT * FROM users WHERE id = $1";\n+ return await db.query(query, [id]);`,
      },
    },
    {
      id: 'SAST-2',
      title: 'Hardcoded Secret',
      severity: 'High',
      file: 'src/config.js',
      line: 12,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Gitleaks',
      detectedAt: 'Sep 30, 2026, 02:15 PM',
      description: 'API access token committed directly in repository source configuration.',
      codeSnippet: {
        code: `// src/config.js:12\nmodule.exports = {\n  ENV: "production",\n  API_KEY: "sk_live_928172938192847291028374", // VULNERABLE SECRET\n};`,
        startLine: 10,
        highlightLine: 12,
      },
      remediation: {
        summary: 'Revoke and rotate the exposed API key. Store secret in .env or cloud secret vault.',
        diffSnippet: `- API_KEY: "sk_live_928172938192847291028374",\n+ API_KEY: process.env.API_KEY,`,
      },
    },
    {
      id: 'SAST-3',
      title: 'Insecure File Upload',
      severity: 'High',
      file: 'src/upload.js',
      line: 45,
      status: 'In Progress',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 28, 2026, 01:20 PM',
      description: 'Missing MIME type validation and file extension check allowing arbitrary file execution.',
      codeSnippet: {
        code: `// src/upload.js:45\napp.post('/upload', (req, res) => {\n  const file = req.files.attachment;\n  file.mv('./public/uploads/' + file.name); // VULNERABLE\n});`,
        startLine: 43,
        highlightLine: 45,
      },
      remediation: {
        summary: 'Validate file headers against an allowed MIME whitelist and generate unique non-executable filenames.',
      },
    },
    {
      id: 'SAST-4',
      title: 'XSS Vulnerability',
      severity: 'Medium',
      file: 'src/components.js',
      line: 18,
      status: 'Fixed',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 27, 2026, 10:14 AM',
      description: 'dangerouslySetInnerHTML invoked with unfiltered user profile comment data.',
      codeSnippet: {
        code: `// src/components.js:18\nexport const Comment = ({ text }) => (\n  <div dangerouslySetInnerHTML={{ __html: text }} />\n);`,
        startLine: 16,
        highlightLine: 18,
      },
      remediation: {
        summary: 'Sanitize HTML via DOMPurify or render pure text child nodes.',
      },
    },
    {
      id: 'SAST-5',
      title: 'Weak Crypto',
      severity: 'Medium',
      file: 'src/crypto.js',
      line: 23,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 26, 2026, 04:30 PM',
      description: 'Use of deprecated MD5 hashing algorithm for password hashing.',
      codeSnippet: {
        code: `// src/crypto.js:23\nconst crypto = require('crypto');\nfunction hashPassword(pwd) {\n  return crypto.createHash('md5').update(pwd).digest('hex'); // INSECURE\n}`,
        startLine: 20,
        highlightLine: 23,
      },
      remediation: {
        summary: 'Use Argon2id or bcrypt with high work factor for password hashing.',
      },
    },
    {
      id: 'SAST-6',
      title: 'Path Traversal',
      severity: 'Low',
      file: 'src/routes/file.js',
      line: 67,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 25, 2026, 09:12 AM',
      description: 'Unvalidated filepath joining enables directory traversal outside base storage path.',
      codeSnippet: {
        code: `// src/routes/file.js:67\nconst filePath = path.join(BASE_DIR, req.query.filename);\nres.sendFile(filePath);`,
        startLine: 65,
        highlightLine: 67,
      },
      remediation: {
        summary: 'Resolve path and verify that resolved path starts with the base directory prefix.',
      },
    },
    {
      id: 'SAST-7',
      title: 'Command Injection',
      severity: 'High',
      file: 'src/services/exec.js',
      line: 22,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 24, 2026, 03:45 PM',
      description: 'System shell child_process.exec invoked with unescaped hostname parameter.',
      codeSnippet: {
        code: `// src/services/exec.js:22\nconst { exec } = require('child_process');\nexec("ping -c 1 " + req.body.host, callback);`,
        startLine: 20,
        highlightLine: 22,
      },
      remediation: {
        summary: 'Use child_process.execFile with argument array instead of raw shell execution.',
      },
    },
    {
      id: 'SAST-8',
      title: 'Insecure Cookie',
      severity: 'Low',
      file: 'src/middleware/auth.js',
      line: 14,
      status: 'Resolved',
      repository: 'frontend-app',
      tool: 'Semgrep SAST',
      detectedAt: 'Sep 23, 2026, 08:30 AM',
      description: 'Session cookie initialized without Secure and HttpOnly flags.',
      codeSnippet: {
        code: `// src/middleware/auth.js:14\nres.cookie('session_id', token, { path: '/' }); // MISSING HttpOnly, Secure`,
        startLine: 12,
        highlightLine: 14,
      },
      remediation: {
        summary: 'Set httpOnly: true, secure: true, sameSite: "strict".',
      },
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setSastFindings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (selectedFinding && selectedFinding.id === id) {
      setSelectedFinding({ ...selectedFinding, status: newStatus });
    }
  };

  const filteredFindings = useMemo(() => {
    return sastFindings.filter((item) => {
      const matchesSearch =
        searchFilter.trim() === '' ||
        item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.file?.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [sastFindings, searchFilter, statusFilter]);

  const getSeverityBadge = (sev: string) => {
    const isCrit = sev === 'Critical';
    const isHigh = sev === 'High';
    const isMed = sev === 'Medium';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: '4px',
          backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FFFBEB' : '#F1F5F9',
          color: isCrit ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#B45309' : '#475569',
          border: `1px solid ${isCrit ? '#FECACA' : isHigh ? '#FFEDD5' : isMed ? '#FEF3C7' : '#E2E8F0'}`,
        }}
      >
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isCrit ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#D97706' : '#64748B',
          }}
        />
        {sev}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isOpen = status === 'Open';
    const isProg = status === 'In Progress';
    const isFixed = status === 'Fixed' || status === 'Resolved';
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: isOpen ? '#FEF2F2' : isProg ? '#FFFBEB' : isFixed ? '#ECFDF5' : '#F1F5F9',
          color: isOpen ? '#DC2626' : isProg ? '#D97706' : isFixed ? '#059669' : '#475569',
          border: `1px solid ${isOpen ? '#FECACA' : isProg ? '#FDE68A' : isFixed ? '#A7F3D0' : '#E2E8F0'}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isOpen ? '#DC2626' : isProg ? '#D97706' : '#059669',
          }}
        />
        {status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px 24px 70px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          <Link href="/products" style={{ color: '#475569', fontWeight: 500 }}>
            Products
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Code</span>
        </div>

        {/* Hero Section Split: Left Copy & Right Interactive SAST Workspace */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.45fr)',
            gap: '36px',
            alignItems: 'flex-start',
            marginBottom: '60px',
          }}
          className="code-hero-grid"
        >
          {/* Hero Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '12px' }}>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <Code2 size={13} />
                SecuLayer Code &bull;
              </span>
            </div>

            <h1
              style={{
                fontSize: '42px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Secure your code from development to production.
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#475569',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: '520px',
              }}
            >
              Detect vulnerabilities, secrets, misconfigurations and supply chain risks in your source code. Integrate
              seamlessly into your development workflow with AI-powered security insights.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/home')}
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
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setExpertOpen(true)}
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
                }}
              >
                <span>View Documentation</span>
              </button>
            </div>
          </div>

          {/* Hero Right: Live Interactive SAST Findings Workspace Table matching Screenshot */}
          <div style={{ width: '100%' }}>
            <SecuLayerDashboardCard
              initialRepo="frontend-app"
              initialBranch="main"
              initialTimeRange="Last 30 days"
              initialTab="Pull Requests"
              initialEngine="SAST"
              onSelectFinding={(f) => setSelectedFinding(f)}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM SECTION: TABS & CAPABILITY CARDS */}
        {/* ========================================================= */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '32px' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '28px' }}>
            {[
              { id: 'capabilities', label: 'Key Capabilities' },
              { id: 'integrations', label: 'Integrations' },
              { id: 'languages', label: 'Supported Languages' },
              { id: 'resources', label: 'Resources' },
            ].map((tab) => {
              const isActive = activeBottomTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveBottomTab(tab.id as any)}
                  style={{
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0F172A' : '#64748B',
                    position: 'relative',
                    padding: '4px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-13px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: '#2563EB',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Key Capabilities (4 Cards in a grid) */}
          {activeBottomTab === 'capabilities' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
              }}
              className="capabilities-grid"
            >
              {/* Card 1 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Code2 size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Static Application Security Testing (SAST)
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Find security issues in your source code with precision AST rules and low false positives.
                </p>
              </div>

              {/* Card 2 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Key size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Secrets Detection
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Detect and prevent exposed secrets across commit history, branches, and PR diffs.
                </p>
              </div>

              {/* Card 3 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Software Composition Analysis (SCA)
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Detect vulnerable open source dependencies and enforce open source license compliance.
                </p>
              </div>

              {/* Card 4 */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  AI-powered Remediation
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Get deterministic fix suggestions and contextual guidance with validated rescan tests.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Integrations */}
          {activeBottomTab === 'integrations' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="capabilities-grid">
              {['GitHub Actions', 'GitLab CI/CD', 'Bitbucket Pipelines', 'CircleCI', 'Jenkins', 'Azure DevOps', 'VS Code Plugin', 'JetBrains IDE'].map((item) => (
                <div key={item} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{item}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Native webhook & CLI runner supported</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Supported Languages */}
          {activeBottomTab === 'languages' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="capabilities-grid">
              {[
                { name: 'JavaScript & TypeScript', desc: 'Node.js, React, Next.js, Express' },
                { name: 'Python', desc: 'FastAPI, Django, Flask, PyTorch' },
                { name: 'Go', desc: 'Gin, Echo, Standard Library' },
                { name: 'Java & Kotlin', desc: 'Spring Boot, Quarkus, Maven, Gradle' },
                { name: 'Rust', desc: 'Cargo, Tokio, Actix-web' },
                { name: 'Ruby', desc: 'Ruby on Rails, Sinatra' },
                { name: 'C & C++', desc: 'CMake, Make, GCC' },
                { name: 'IaC & Configs', desc: 'Terraform, Dockerfile, Kubernetes YAML' },
              ].map((lang) => (
                <div key={lang.name} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{lang.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{lang.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Resources */}
          {activeBottomTab === 'resources' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="capabilities-grid">
              {[
                { title: 'SecuLayer CLI Documentation', desc: 'Command line automated scanning for local development and git pre-commit hooks.' },
                { title: 'Custom Rule Writing Guide', desc: 'Author deterministic Semgrep & Rego rules tailored to your internal security contracts.' },
                { title: 'CI/CD Pipeline Examples', desc: 'Pre-configured workflow templates for GitHub Actions, GitLab, and Bitbucket.' },
              ].map((res) => (
                <div key={res.title} style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{res.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>{res.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Global Modals & Drawers */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelectFinding={(f) => setSelectedFinding(f)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      <FindingDetailDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <style jsx>{`
        @media (max-width: 1080px) {
          .code-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .code-mini-sidebar {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .capabilities-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
