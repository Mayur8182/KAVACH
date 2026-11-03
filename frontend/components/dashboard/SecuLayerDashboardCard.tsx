'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  FolderGit2,
  GitBranch,
  Search,
  Layers,
  GitPullRequest,
  ShieldAlert,
  Terminal,
  Settings,
  Cloud,
  Globe,
  Database,
  KeyRound,
  Network,
  Cpu,
} from 'lucide-react';
import { FindingDetailDrawer, FindingDetailData } from '@/components/common/FindingDetailDrawer';

// Static Finding Templates defined outside component to avoid re-allocating 350+ lines of objects on every render pass (Point 1: Har render par expensive calculations)
const BASE_CODE_FINDINGS: FindingDetailData[] = [
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
      description: 'Dynamic raw query string interpolation via user parameters without sanitization or parameterization.',
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
      description: 'API access token committed directly in repository source configuration file.',
      codeSnippet: {
        code: `// src/config.js:12\nmodule.exports = {\n  ENV: "production",\n  API_KEY: "sk_live_928172938192847291028374", // VULNERABLE SECRET\n};`,
        startLine: 10,
        highlightLine: 12,
      },
      remediation: {
        summary: 'Revoke and rotate exposed API key. Store secret in environment variables or cloud secret vault.',
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
        diffSnippet: `+ const safeExt = validateExtension(file.name);\n+ const targetPath = path.join(UPLOAD_DIR, crypto.randomUUID() + safeExt);\n- file.mv('./public/uploads/' + file.name);\n+ file.mv(targetPath);`,
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
      detectedAt: 'Sep 27, 2026, 04:55 PM',
      description: 'Direct dangerouslySetInnerHTML injection without DOMPurify sanitization in React component.',
      codeSnippet: {
        code: `// src/components.js:18\nexport function UserBio({ bio }) {\n  return <div dangerouslySetInnerHTML={{ __html: bio }} />; // VULNERABLE\n}`,
        startLine: 16,
        highlightLine: 18,
      },
      remediation: {
        summary: 'Sanitize incoming HTML strings with DOMPurify before rendering into DOM.',
        diffSnippet: `- return <div dangerouslySetInnerHTML={{ __html: bio }} />;\n+ return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bio) }} />;`,
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
      detectedAt: 'Sep 26, 2026, 10:14 AM',
      description: 'Use of broken MD5 hashing algorithm for password derivation instead of Argon2id or bcrypt.',
      codeSnippet: {
        code: `// src/crypto.js:23\nfunction hashPassword(pwd) {\n  return crypto.createHash('md5').update(pwd).digest('hex'); // WEAK CRYPTO\n}`,
        startLine: 21,
        highlightLine: 23,
      },
      remediation: {
        summary: 'Replace MD5 hash with Argon2id or bcrypt with adaptive cost factor.',
        diffSnippet: `- return crypto.createHash('md5').update(pwd).digest('hex');\n+ return await argon2.hash(pwd, { type: argon2.argon2id });`,
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
      detectedAt: 'Sep 25, 2026, 03:30 PM',
      description: 'Direct path concatenation allows relative directory traversal ../.. escape.',
      codeSnippet: {
        code: `// src/routes/file.js:67\napp.get('/download', (req, res) => {\n  const file = req.query.filename;\n  res.sendFile(path.join(__dirname, 'static', file)); // VULNERABLE\n});`,
        startLine: 65,
        highlightLine: 67,
      },
      remediation: {
        summary: 'Resolve target file path and assert that it remains strictly inside base directory root.',
        diffSnippet: `+ const safePath = path.resolve(STATIC_DIR, file);\n+ if (!safePath.startsWith(STATIC_DIR)) throw new Error('Forbidden');\n- res.sendFile(path.join(__dirname, 'static', file));\n+ res.sendFile(safePath);`,
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
      detectedAt: 'Sep 24, 2026, 09:05 AM',
      description: 'Passing untrusted shell string directly to child_process.exec() allowing arbitrary code execution.',
      codeSnippet: {
        code: `// src/services/exec.js:22\nconst { exec } = require('child_process');\nfunction pingHost(host) {\n  exec('ping -c 1 ' + host); // VULNERABLE\n}`,
        startLine: 20,
        highlightLine: 22,
      },
      remediation: {
        summary: 'Use child_process.execFile() or spawn() with argument arrays instead of shell execution.',
        diffSnippet: `- exec('ping -c 1 ' + host);\n+ execFile('ping', ['-c', '1', host]);`,
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
      detectedAt: 'Sep 23, 2026, 11:20 AM',
      description: 'Session authentication cookie missing Secure and SameSite=Strict security flags.',
      codeSnippet: {
        code: `// src/middleware/auth.js:14\nres.cookie('session_token', token, {\n  httpOnly: true,\n  // Missing secure: true, sameSite: 'strict'\n});`,
        startLine: 12,
        highlightLine: 14,
      },
      remediation: {
        summary: 'Set secure: true and sameSite: strict on all authentication session cookies.',
        diffSnippet: `  res.cookie('session_token', token, {\n    httpOnly: true,\n+   secure: process.env.NODE_ENV === 'production',\n+   sameSite: 'strict',\n  });`,
      },
    },
  ];

  // Cloud findings matching the same visual pattern (Point 1: static module memoization)
  const BASE_CLOUD_FINDINGS: FindingDetailData[] = [
    {
      id: 'CLOUD-1',
      title: 'S3 Bucket Public Read',
      severity: 'Critical',
      file: 'arn:aws:s3:::prod-customer-backups',
      line: 1,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Trivy CSPM',
      detectedAt: 'Sep 29, 2026, 09:12 AM',
      description: 'S3 bucket has AllUsers Read ACL enabled allowing public exfiltration.',
      cloudResource: {
        arn: 'arn:aws:s3:::prod-customer-backups',
        provider: 'AWS',
        region: 'us-east-1',
        cisBenchmark: 'CIS AWS 1.4: 2.1.5',
      },
      remediation: {
        summary: 'Enable S3 Block Public Access at the bucket and account level.',
        diffSnippet: `aws s3api put-public-access-block --bucket prod-customer-backups --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
      },
    },
    {
      id: 'CLOUD-2',
      title: 'IAM Admin Wildcard Policy',
      severity: 'Critical',
      file: 'arn:aws:iam::123456789012:role/app-deployer',
      line: 1,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Checkov',
      detectedAt: 'Sep 28, 2026, 02:40 PM',
      description: 'IAM role has Action: "*" on Resource: "*" violating least privilege.',
      cloudResource: {
        arn: 'arn:aws:iam::123456789012:role/app-deployer',
        provider: 'AWS',
        region: 'global',
        cisBenchmark: 'CIS AWS 1.4: 1.16',
      },
      remediation: {
        summary: 'Scope IAM actions strictly to required deployment service resources.',
      },
    },
    {
      id: 'CLOUD-3',
      title: 'Security Group 0.0.0.0/0 on Port 22',
      severity: 'High',
      file: 'sg-0a9b8c7d6e5f4a3b2',
      line: 22,
      status: 'In Progress',
      repository: 'frontend-app',
      tool: 'Trivy CSPM',
      detectedAt: 'Sep 27, 2026, 11:15 AM',
      description: 'SSH management port is exposed to the public internet 0.0.0.0/0.',
      cloudResource: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-0a9b8c7d6e5f4a3b2',
        provider: 'AWS',
        region: 'us-east-1',
        cisBenchmark: 'CIS AWS 1.4: 4.1',
      },
      remediation: {
        summary: 'Restrict port 22 ingress to corporate VPN CIDR blocks or use AWS SSM.',
      },
    },
    {
      id: 'CLOUD-4',
      title: 'EBS Volume Unencrypted',
      severity: 'High',
      file: 'vol-0918273645abcdef0',
      line: 1,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Checkov',
      detectedAt: 'Sep 26, 2026, 04:22 PM',
      description: 'Production database storage volume is unencrypted at rest.',
      cloudResource: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-0918273645abcdef0',
        provider: 'AWS',
        region: 'us-east-1',
        cisBenchmark: 'CIS AWS 1.4: 2.2.1',
      },
      remediation: {
        summary: 'Enable default EBS KMS CMK encryption across region.',
      },
    },
    {
      id: 'CLOUD-5',
      title: 'RDS Snapshot Publicly Accessible',
      severity: 'High',
      file: 'rds:prod-db-snapshot-2026',
      line: 1,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Trivy CSPM',
      detectedAt: 'Sep 25, 2026, 01:10 PM',
      description: 'Database snapshot shared with external AWS accounts.',
      cloudResource: {
        arn: 'arn:aws:rds:us-west-2:123456789012:snapshot:prod-db-snapshot-2026',
        provider: 'AWS',
        region: 'us-west-2',
        cisBenchmark: 'CIS AWS 1.4: 2.3.1',
      },
      remediation: {
        summary: 'Revoke public and cross-account snapshot sharing attributes.',
      },
    },
    {
      id: 'CLOUD-6',
      title: 'Root Account MFA Not Enabled',
      severity: 'Critical',
      file: 'aws-root-account',
      line: 1,
      status: 'Fixed',
      repository: 'frontend-app',
      tool: 'CIS Benchmark',
      detectedAt: 'Sep 24, 2026, 10:00 AM',
      description: 'AWS Root account lacks hardware/virtual multi-factor authentication.',
      cloudResource: {
        arn: 'arn:aws:iam::123456789012:root',
        provider: 'AWS',
        region: 'global',
        cisBenchmark: 'CIS AWS 1.4: 1.5',
      },
      remediation: {
        summary: 'Enforce hardware security key or TOTP on root credentials.',
      },
    },
    {
      id: 'CLOUD-7',
      title: 'CloudTrail Logging Disabled',
      severity: 'Medium',
      file: 'arn:aws:cloudtrail:us-east-1:1234:trail/main',
      line: 1,
      status: 'Open',
      repository: 'frontend-app',
      tool: 'Checkov',
      detectedAt: 'Sep 23, 2026, 08:45 AM',
      description: 'Multi-region CloudTrail logging was temporarily toggled off.',
      cloudResource: {
        arn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/main',
        provider: 'AWS',
        region: 'us-east-1',
        cisBenchmark: 'CIS AWS 1.4: 3.1',
      },
      remediation: {
        summary: 'Re-enable multi-region CloudTrail audit trail logging.',
      },
    },
    {
      id: 'CLOUD-8',
      title: 'Kubernetes Dashboard Exposed',
      severity: 'Critical',
      file: 'k8s-cluster-prod-eks',
      line: 1,
      status: 'Resolved',
      repository: 'frontend-app',
      tool: 'Trivy CSPM',
      detectedAt: 'Sep 22, 2026, 12:30 PM',
      description: 'Cluster dashboard service accessible without mutual TLS or bastion.',
      cloudResource: {
        arn: 'arn:aws:eks:us-east-1:123456789012:cluster/prod-eks',
        provider: 'AWS',
        region: 'us-east-1',
        cisBenchmark: 'CIS EKS 1.2: 4.2',
      },
      remediation: {
        summary: 'Remove public NodePort/LoadBalancer mapping for internal management plane.',
      },
    },
  ];

export interface SecuLayerDashboardCardProps {
  mode?: 'code' | 'cloud';
  initialRepo?: string;
  initialBranch?: string;
  initialTimeRange?: string;
  initialTab?: string;
  initialEngine?: string;
  onSelectFinding?: (finding: FindingDetailData) => void;
  className?: string;
}

export const SecuLayerDashboardCard: React.FC<SecuLayerDashboardCardProps> = ({
  mode = 'code',
  initialRepo = mode === 'cloud' ? 'AWS - Production' : 'frontend-app',
  initialBranch = mode === 'cloud' ? 'us-east-1' : 'main',
  initialTimeRange = 'Last 30 days',
  initialTab = mode === 'cloud' ? 'Assets' : 'Pull Requests',
  initialEngine = mode === 'cloud' ? 'Storage' : 'SAST',
  onSelectFinding,
  className = '',
}) => {
  // State controls
  const [selectedRepo, setSelectedRepo] = useState(initialRepo);
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [selectedTimeRange, setSelectedTimeRange] = useState(initialTimeRange);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeEngine, setActiveEngine] = useState(initialEngine);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');

  // Drawer inspection state
  const [inspectedFinding, setInspectedFinding] = useState<FindingDetailData | null>(null);

  // Lazy state initialization — runs once on mount, not on every render
  const [activeFindingsList, setActiveFindingsList] = useState<FindingDetailData[]>(() =>
    (mode === 'cloud' ? BASE_CLOUD_FINDINGS : BASE_CODE_FINDINGS).map((item) => ({
      ...item,
      repository: initialRepo,
    }))
  );

  // Handle status update memoized
  const handleUpdateStatus = useCallback((id: string, newStatus: string) => {
    setActiveFindingsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    setInspectedFinding((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev
    );
  }, []);

  // Pagination state (Point 2 & Point 8: Virtualization & bounded list pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered dataset
  const filteredFindings = useMemo(() => {
    return activeFindingsList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.file?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesLanguage =
        languageFilter === 'All' ||
        (languageFilter === 'JavaScript' && item.file?.endsWith('.js')) ||
        (languageFilter === 'TypeScript' && item.file?.endsWith('.ts')) ||
        (languageFilter === 'Python' && item.file?.endsWith('.py')) ||
        (languageFilter === 'AWS' && item.file?.includes('aws')) ||
        (languageFilter === 'Kubernetes' && item.file?.includes('k8s'));

      return matchesSearch && matchesStatus && matchesLanguage;
    });
  }, [activeFindingsList, searchQuery, statusFilter, languageFilter]);

  // Windowed list slice to avoid rendering unbounded DOM nodes
  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  // Severity badge matching screenshot: light background, small colored dot
  const renderSeverityBadge = (sev: string) => {
    const isCrit = sev === 'Critical';
    const isHigh = sev === 'High';
    const isMed = sev === 'Medium';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '12px',
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: '16px',
          backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FEFCE8' : '#F1F5F9',
          color: isCrit ? '#DC2626' : isHigh ? '#EA580C' : isMed ? '#CA8A04' : '#475569',
          border: `1px solid ${isCrit ? '#FEE2E2' : isHigh ? '#FFEDD5' : isMed ? '#FEF08A' : '#E2E8F0'}`,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isCrit ? '#EF4444' : isHigh ? '#F97316' : isMed ? '#EAB308' : '#64748B',
          }}
        />
        {sev}
      </span>
    );
  };

  // Status badge matching screenshot: rounded pill with dot
  const renderStatusBadge = (status: string) => {
    const isOpen = status === 'Open';
    const isInProg = status === 'In Progress';
    const isFixed = status === 'Fixed' || status === 'Resolved';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '12px',
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: '16px',
          backgroundColor: isOpen ? '#FEF2F2' : isInProg ? '#FEFCE8' : '#F0FDF4',
          color: isOpen ? '#DC2626' : isInProg ? '#CA8A04' : '#16A34A',
          border: `1px solid ${isOpen ? '#FEE2E2' : isInProg ? '#FEF08A' : '#DCFCE7'}`,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isOpen ? '#EF4444' : isInProg ? '#EAB308' : '#22C55E',
          }}
        />
        {status}
      </span>
    );
  };

  const sidebarLinks =
    mode === 'cloud'
      ? [
          { label: 'Overview', icon: <Layers size={16} /> },
          { label: 'Cloud Accounts', icon: <Cloud size={16} /> },
          { label: 'Assets', icon: <Globe size={16} /> },
          { label: 'Security Findings', icon: <ShieldAlert size={16} /> },
          { label: 'Compliance', icon: <Terminal size={16} /> },
          { label: 'Settings', icon: <Settings size={16} /> },
        ]
      : [
          { label: 'Overview', icon: <Layers size={16} /> },
          { label: 'Repositories', icon: <FolderGit2 size={16} /> },
          { label: 'Pull Requests', icon: <GitPullRequest size={16} /> },
          { label: 'Security Findings', icon: <ShieldAlert size={16} /> },
          { label: 'CI/CD', icon: <Terminal size={16} /> },
          { label: 'Settings', icon: <Settings size={16} /> },
        ];

  const engineLinks =
    mode === 'cloud'
      ? ['Storage', 'IAM', 'Network', 'Kubernetes']
      : ['SAST', 'SCA', 'Secrets', 'Dependencies'];

  return (
    <div
      className={className}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP SELECTOR BAR */}
      {/* ========================================================================= */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left: Repository/Account & Branch/Region Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Main entity selector pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            {mode === 'cloud' ? <Cloud size={16} color="#0284C7" /> : <FolderGit2 size={16} color="#2563EB" />}
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#0F172A',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              {mode === 'cloud' ? (
                <>
                  <option value="AWS - Production">AWS - Production</option>
                  <option value="GCP - Core Infra">GCP - Core Infra</option>
                  <option value="Azure - Enterprise">Azure - Enterprise</option>
                </>
              ) : (
                <>
                  <option value="frontend-app">frontend-app</option>
                  <option value="api-service">api-service</option>
                  <option value="data-pipeline">data-pipeline</option>
                  <option value="auth-service">auth-service</option>
                </>
              )}
            </select>
          </div>

          {/* Sub entity selector pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            {mode === 'cloud' ? <Globe size={14} color="#64748B" /> : <GitBranch size={14} color="#64748B" />}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              {mode === 'cloud' ? (
                <>
                  <option value="us-east-1">us-east-1</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="global">global</option>
                  <option value="ap-south-1">ap-south-1</option>
                </>
              ) : (
                <>
                  <option value="main">main</option>
                  <option value="staging">staging</option>
                  <option value="feature/auth-v2">feature/auth-v2</option>
                  <option value="dev">dev</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Right: Date Range Picker */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 14 days">Last 14 days</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="All Time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY: LEFT SIDEBAR + RIGHT MAIN TABLE */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', minHeight: '480px' }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: '180px',
            borderRight: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          {/* Top section links */}
          {sidebarLinks.map((item) => {
            const isItemActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveTab(item.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  backgroundColor: isItemActive ? '#EFF6FF' : 'transparent',
                  color: isItemActive ? '#2563EB' : '#475569',
                  fontSize: '13px',
                  fontWeight: isItemActive ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span style={{ color: isItemActive ? '#2563EB' : '#64748B' }}>{item.icon}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}

          {/* Engines Heading */}
          <div
            style={{
              marginTop: '16px',
              padding: '6px 10px 4px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {mode === 'cloud' ? 'Categories' : 'Engines'}
          </div>

          {/* Engine Items */}
          {engineLinks.map((eng) => {
            const isEngActive = activeEngine === eng;
            return (
              <button
                key={eng}
                type="button"
                onClick={() => setActiveEngine(eng)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: isEngActive ? '#EFF6FF' : 'transparent',
                  color: isEngActive ? '#2563EB' : '#475569',
                  fontSize: '13px',
                  fontWeight: isEngActive ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span>{eng}</span>
              </button>
            );
          })}
        </div>

        {/* Right Main Content */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowX: 'auto' }}>
          {/* Header Row: Title & Search/Filters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {activeEngine} Findings
            </h2>

            {/* Controls: Search + Status + Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search input with rounded pill design */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Search Findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 14px 6px 34px',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    outline: 'none',
                    width: '180px',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>

              {/* Status Filter Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="All">Status</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Sub-filter Pill (Language / Provider) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {mode === 'cloud' ? (
                    <>
                      <option value="All">Type</option>
                      <option value="AWS">AWS Services</option>
                      <option value="Kubernetes">Kubernetes</option>
                    </>
                  ) : (
                    <>
                      <option value="All">Language</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="TypeScript">TypeScript</option>
                      <option value="Python">Python</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              border: '1px solid #F1F5F9',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    color: '#64748B',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '40px' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>Title</th>
                  <th style={{ padding: '12px 14px' }}>Severity</th>
                  <th style={{ padding: '12px 14px' }}>{mode === 'cloud' ? 'Resource' : 'File'}</th>
                  <th style={{ padding: '12px 14px', width: '90px' }}>{mode === 'cloud' ? 'Region' : 'Line'}</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFindings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                      No findings matching your active filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFindings.map((finding, index) => (
                    <tr
                      key={finding.id}
                      onClick={() => {
                        setInspectedFinding(finding);
                        if (onSelectFinding) onSelectFinding(finding);
                      }}
                      style={{
                        borderBottom: index < paginatedFindings.length - 1 ? '1px solid #F8FAFC' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: '#94A3B8', fontWeight: 500 }}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                        {finding.title}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {renderSeverityBadge(finding.severity)}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          color: '#475569',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          maxWidth: '240px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {finding.file}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>
                        {mode === 'cloud' ? finding.cloudResource?.region || 'global' : finding.line}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {renderStatusBadge(finding.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls (Point 2: Large lists bounded virtualization & pagination) */}
            {filteredFindings.length > pageSize && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid #F1F5F9',
                  backgroundColor: '#FAFAFA',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredFindings.length)} of{' '}
                  {filteredFindings.length} findings
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
                      color: currentPage === 1 ? '#94A3B8' : '#0F172A',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
                      color: currentPage >= totalPages ? '#94A3B8' : '#0F172A',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Drawer for Finding Detail Inspection */}
      <FindingDetailDrawer
        finding={inspectedFinding}
        isOpen={!!inspectedFinding}
        onClose={() => setInspectedFinding(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
