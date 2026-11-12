'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Terminal,
  Shield,
  Layers,
  Code2,
  Cpu,
  Key,
  FileText,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
  Cloud,
  CheckCircle2,
  Sparkles,
  Lock,
  Server,
  Box,
  Eye,
  Activity,
  GitBranch,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';

interface DocSectionContent {
  category: string;
  title: string;
  subtitle: string;
  principle?: string;
  items: Array<{
    heading: string;
    text: string;
    code?: string;
    lang?: string;
    link?: { label: string; href: string };
  }>;
}

const DOC_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      { id: 'quickstart', title: 'Kavach Quickstart' },
      { id: 'architecture', title: 'Architecture & Determinism' },
      { id: 'cli', title: 'Antigravity CLI (agy)' },
      { id: 'auth', title: 'Authentication & Tokens' },
    ],
  },
  {
    id: 'security-engines',
    title: 'Security Engines',
    items: [
      { id: 'sast-secrets', title: 'SAST & Secret Detection' },
      { id: 'container-sbom', title: 'Containers & CycloneDX SBOM' },
      { id: 'cloud-cspm', title: 'Cloud Misconfiguration & IaC' },
      { id: 'runtime-ebpf', title: 'eBPF Behavioral Runtime' },
      { id: 'mcp-gateway', title: 'Model Context Protocol (MCP) Guard' },
    ],
  },
  {
    id: 'governance',
    title: 'Policy & Governance',
    items: [
      { id: 'opa-rego', title: 'OPA & Rego Contract Engine' },
      { id: 'agent-identity', title: 'AI Agent RBAC & Approvals' },
      { id: 'audit-evidence', title: 'Immutable Cryptographic Evidence' },
    ],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    items: [
      { id: 'api-overview', title: 'REST API v1 Overview' },
      { id: 'api-projects', title: 'Projects & Workspaces' },
      { id: 'api-scans', title: 'Scans & Findings' },
      { id: 'api-protect', title: 'Protect & Enforcement' },
    ],
  },
];

const DOC_DETAILS: Record<string, DocSectionContent> = {
  quickstart: {
    category: 'Getting Started',
    title: 'Kavach Quickstart',
    subtitle: 'Get up and running with Kavach deterministic security control plane in under 5 minutes.',
    principle: 'LLM proposes. Deterministic security systems decide. Runtime evidence proves.',
    items: [
      {
        heading: '1. Launch the End-to-End Onboarding Wizard',
        text: 'Set up your real multi-tenant organization, workspace, git repository connection, and deployment target. All onboarding settings are persisted in PostgreSQL with immutable cryptographic audit logging.',
        link: { label: 'Launch Onboarding Wizard →', href: '/onboarding/organization' },
      },
      {
        heading: '2. Install the Antigravity CLI (agy)',
        text: 'The Antigravity CLI allows you to execute SAST scans, secret detection, SBOM verification, and OPA policy evaluation directly from your workstation or CI/CD pipelines.',
        code: 'curl -sSL https://get.Kavach.io | bash\nagy auth login --token <YOUR_Kavach_API_TOKEN>\nagy scan . --all',
        lang: 'bash',
      },
      {
        heading: '3. Architectural Golden Rule',
        text: 'LLMs are never the authoritative security boundary in Kavach. Autonomous AI agents investigate anomalies and propose code diffs, while deterministic engines (Semgrep, Trivy, Gitleaks, OPA) approve or reject executions with verifiable proofs.',
      },
    ],
  },
  architecture: {
    category: 'Getting Started',
    title: 'Architecture & Determinism',
    subtitle: 'Understand the three-tier separation of concerns that separates AI proposals from deterministic enforcement.',
    principle: 'Zero-trust AI orchestration: An LLM has zero authority to deploy, grant permissions, or alter security rules without deterministic verification.',
    items: [
      {
        heading: 'Three-Tier Separation of Authority',
        text: '1. Autonomous Proposal Layer: LLM models analyze context and generate pull-request remediation diffs.\n2. Deterministic Enforcement Core: OPA Rego policies and CLI security scanners decide ALLOW / BLOCK.\n3. Runtime Evidence Ledger: eBPF kernel monitors and PostgreSQL store immutable cryptographic hashes for every execution.',
      },
      {
        heading: 'No Hardcoded Fallbacks & Real Persistence',
        text: 'In production, Kavach persists all organizations, workspaces, projects, scan findings, and audit trails in PostgreSQL. No frontend localStorage or mock endpoints are ever used to simulate security posture.',
        code: '# PostgreSQL schema relationships\nOrganization (1) ──< Workspace (N) ──< Project (N) ──< ScanRun (N) ──< Finding (N)',
        lang: 'text',
      },
      {
        heading: 'Verification Sequence',
        text: 'Every pull request or commit follows: Scan -> Policy Gate Check -> Human Approval (if risk high) -> Merge -> Build Attestation -> eBPF Runtime Enclave.',
      },
    ],
  },
  cli: {
    category: 'Getting Started',
    title: 'Antigravity CLI (agy)',
    subtitle: 'Unified developer tooling for scanning repositories, verifying builds, and enforcing security contracts.',
    items: [
      {
        heading: 'CLI Installation & Version Check',
        text: 'Install the latest agy binary for macOS, Linux, or Windows (via PowerShell):',
        code: '# macOS / Linux\ncurl -fsSL https://cli.Kavach.io/install.sh | sh\n\n# Windows PowerShell\niwr -useb https://cli.Kavach.io/install.ps1 | iex\n\nagy --version',
        lang: 'bash',
      },
      {
        heading: 'Authenticating with API Tokens',
        text: 'Authenticate your CLI instance with a personal or machine service account token:',
        code: 'agy auth login --token sec_pat_9a8b7c6d5e4f3a2b1c0\nagy whoami',
        lang: 'bash',
      },
      {
        heading: 'Running Local Audits & Policy Evaluation',
        text: 'Execute real scanners locally before pushing code to remote branches:',
        code: 'agy scan --path . --sast --secrets --iac\nagy policy check --policy policies/security_gate.rego --input scan-results.json',
        lang: 'bash',
      },
    ],
  },
  auth: {
    category: 'Getting Started',
    title: 'Authentication & Tokens',
    subtitle: 'Production security tokens, TOTP Multi-Factor Authentication, and API authorization.',
    items: [
      {
        heading: 'Multi-Factor Authentication (MFA/TOTP)',
        text: 'Kavach enforces RFC 6238 TOTP authenticators for all administrative accounts. Setup produces a base32 secret and cryptographically generated backup recovery codes stored in hashed vaults.',
        link: { label: 'Configure MFA Now →', href: '/mfa/setup' },
      },
      {
        heading: 'API Bearer Token Authorization',
        text: 'All backend endpoints require a valid JWT Bearer header. Use short-lived user tokens or organization service account tokens:',
        code: 'GET /api/v1/auth/me HTTP/1.1\nHost: api.Kavach.io\nAuthorization: Bearer <ACCESS_TOKEN>\nContent-Type: application/json',
        lang: 'http',
      },
      {
        heading: 'Organization Tenant Scoping',
        text: 'Include the X-Organization-ID header to scope multi-tenant requests to a specific organization or workspace:',
        code: 'X-Organization-ID: 7d2f4810-72c0-43b6-9bb2-1279a0e66c1b',
        lang: 'text',
      },
    ],
  },
  'sast-secrets': {
    category: 'Security Engines',
    title: 'SAST & Secret Detection',
    subtitle: 'Real static code analysis and credential leakage scanning powered by Semgrep and Gitleaks.',
    items: [
      {
        heading: 'Static Application Security Testing (Semgrep)',
        text: 'Semgrep analyzes abstract syntax trees (AST) to detect injection flaws, insecure deserialization, broken cryptography, and OWASP Top 10 vulnerabilities across 30+ programming languages.',
        code: 'semgrep scan --config p/security-audit --config p/owasp-top-ten --json -o sast_report.json',
        lang: 'bash',
      },
      {
        heading: 'High-Entropy Secret Detection (Gitleaks)',
        text: 'Gitleaks examines git commit histories and uncommitted working trees to intercept exposed AWS keys, Stripe tokens, private certificates, and database connection strings before they reach remote repositories.',
        code: 'gitleaks detect --source . --verbose --report-path gitleaks_report.json',
        lang: 'bash',
      },
      {
        heading: 'Deterministic Remediation Workflow',
        text: 'When a security finding is detected, Kavach generates an exact unified diff. The code must undergo automated re-scanning and pass cleanly before status updates to FIXED.',
      },
    ],
  },
  'container-sbom': {
    category: 'Security Engines',
    title: 'Containers & CycloneDX SBOM',
    subtitle: 'Container vulnerability assessment with Trivy and cryptographic CycloneDX 1.5 Software Bill of Materials.',
    items: [
      {
        heading: 'Container Image Scanning (Trivy Core)',
        text: 'Trivy inspects base OS images and application language packages (npm, pip, maven, cargo, go) against CVE and NVD databases to detect unpatched vulnerabilities.',
        code: 'trivy image --format json --output trivy_report.json myapp:latest',
        lang: 'bash',
      },
      {
        heading: 'CycloneDX 1.5 SBOM Generation',
        text: 'Generate verifiable Software Bill of Materials in CycloneDX standard format with package URLs (pURL) and cryptographic SHA-256 hashes:',
        code: 'trivy fs --format cyclonedx --output sbom.cdx.json .',
        lang: 'bash',
      },
      {
        heading: 'SLSA Level 3 Supply Chain Attestation',
        text: 'Kavach signs SBOMs and container build manifests with Sigstore Cosign keys, providing immutable provenance across the entire CI/CD build chain.',
      },
    ],
  },
  'cloud-cspm': {
    category: 'Security Engines',
    title: 'Cloud Misconfiguration & IaC',
    subtitle: 'Continuous cloud security posture management and Infrastructure-as-Code checks with Checkov.',
    items: [
      {
        heading: 'Infrastructure-as-Code Audits (Checkov)',
        text: 'Checkov scans Terraform (.tf), AWS CloudFormation, Kubernetes YAML, and ARM templates for over 1,000 CIS benchmark violations prior to provisioning.',
        code: 'checkov -d ./infra --framework terraform,kubernetes --output json',
        lang: 'bash',
      },
      {
        heading: 'Zero Permissive Policy Enforcement',
        text: 'Automatically flag and block wildcard IAM policies (Action: "*", Resource: "*"), public S3 buckets, unencrypted RDS instances, and unshielded ingress security groups.',
      },
      {
        heading: 'Multi-Cloud Drift Detection',
        text: 'Connect AWS, Azure, and GCP read-only audit roles to continuously identify configuration drift between production cloud state and declarative git repositories.',
      },
    ],
  },
  'runtime-ebpf': {
    category: 'Security Engines',
    title: 'eBPF Behavioral Runtime',
    subtitle: 'Kernel-space syscall tracing, unauthorized execution blocking, and zero-overhead process containment.',
    items: [
      {
        heading: 'Kernel Syscall Interception',
        text: 'Kavach eBPF probes attach to kernel tracepoints (`sys_enter_execve`, `sys_enter_connect`, `sys_enter_openat`) to detect anomalous outbound connections or unauthorized binary execution within container workloads.',
        code: '// eBPF tracepoint hook\nSEC("tracepoint/syscalls/sys_enter_execve")\nint trace_execve(struct trace_event_raw_sys_enter* ctx) {\n    // Inspect binary path and block unauthorized processes\n    return 0;\n}',
        lang: 'c',
      },
      {
        heading: 'Process Drift & Container Escape Prevention',
        text: 'When a containerized process attempts to execute a shell inside a hardened container or mount root cgroups, eBPF instantly sends SIGKILL and registers an alert.',
      },
      {
        heading: 'Near-Zero Overhead',
        text: 'Operates in kernel space with less than 1.5% CPU overhead, eliminating heavy userspace proxy latency in microservice clusters.',
      },
    ],
  },
  'mcp-gateway': {
    category: 'Security Engines',
    title: 'Model Context Protocol (MCP) Guard',
    subtitle: 'Secure execution gateway, identity verification, and human-in-the-loop approvals for MCP agent tools.',
    items: [
      {
        heading: 'The MCP Security Gateway Architecture',
        text: 'All AI agent tool calls pass through the Kavach gateway before hitting underlying tools: Agent -> Tool Request -> Identity -> Authorization -> Policy -> Risk Check -> Approval -> Execution -> Audit.',
      },
      {
        heading: 'Risk Rating & Tool Schema Verification',
        text: 'Every tool invocation is classified by blast radius: LOW (read-only queries), MEDIUM (localized modifications), HIGH (shell execution, database write, secret retrieval).',
        code: '{\n  "jsonrpc": "2.0",\n  "method": "tools/call",\n  "params": {\n    "name": "execute_database_migration",\n    "risk_level": "HIGH",\n    "requires_approval": true\n  }\n}',
        lang: 'json',
      },
      {
        heading: 'Human-in-the-Loop Gating',
        text: 'High-risk actions generate an immediate cryptographic approval ticket. The tool cannot execute until authorized by a credentialed security lead.',
      },
    ],
  },
  'opa-rego': {
    category: 'Policy & Governance',
    title: 'OPA & Rego Contract Engine',
    subtitle: 'Deterministic, declarative security policies evaluated using Open Policy Agent.',
    items: [
      {
        heading: 'Why Open Policy Agent (OPA)?',
        text: 'Security decisions must never be evaluated by probabilistic LLM tokens. OPA compiles Rego code into deterministic truth tables evaluated in sub-millisecond execution times.',
      },
      {
        heading: 'Example Security Gate Contract',
        text: 'This policy rejects any PR where critical vulnerabilities or leaked secrets remain unresolved:',
        code: 'package Kavach.delivery\n\ndefault allow = false\n\n# Allow only if no critical findings and all scans passed\nallow {\n    input.scans.sast.critical_count == 0\n    input.scans.secrets.findings_count == 0\n    input.scans.container.cvss_max < 7.0\n}\n\nreason["Critical SAST vulnerabilities detected"] {\n    input.scans.sast.critical_count > 0\n}\n\nreason["Plaintext secrets detected in commit"] {\n    input.scans.secrets.findings_count > 0\n}',
        lang: 'rego',
      },
      {
        heading: 'Evaluating Policy via API',
        text: 'POST /api/v1/protect/evaluate executes the Rego contract against the incoming build payload and returns a boolean decision with detailed violation reasons.',
      },
    ],
  },
  'agent-identity': {
    category: 'Policy & Governance',
    title: 'AI Agent RBAC & Approvals',
    subtitle: 'Cryptographic identities, capability certificates, and role-based access for autonomous agents.',
    items: [
      {
        heading: 'Machine Identity for AI Swarms',
        text: 'Autonomous coding agents receive dedicated SPIFFE-compatible identities and short-lived mTLS client certificates, preventing credential sharing across agents.',
      },
      {
        heading: 'Capability-Scoped Execution',
        text: 'Grant agents minimal necessary capabilities (e.g. `repo:read`, `diff:propose`), strictly disallowing `repo:admin`, `secret:decrypt`, or `deploy:production`.',
      },
      {
        heading: 'Tamper-Proof Audit Logging',
        text: 'Every autonomous model invocation, proposed code snippet, and execution output is recorded with parent agent IDs for end-to-end provenance.',
      },
    ],
  },
  'audit-evidence': {
    category: 'Policy & Governance',
    title: 'Immutable Cryptographic Evidence',
    subtitle: 'Tamper-evident audit trails, SHA-256 evidence ledgers, and compliance exports.',
    items: [
      {
        heading: 'The Evidence Ledger',
        text: 'Every security event records: Actor ID, Action, Resource Type, Input Hash, Output Hash, Policy Verdict, and UTC Timestamp in PostgreSQL AuditEvent tables.',
        code: 'SELECT id, action, resource_id, actor_id, status, timestamp, event_metadata\nFROM audit_events\nORDER BY timestamp DESC\nLIMIT 10;',
        lang: 'sql',
      },
      {
        heading: 'Cryptographic Integrity Verification',
        text: 'Audit event records are chained with SHA-256 state hashes, ensuring that retroactive log tampering or database modification is mathematically impossible.',
      },
      {
        heading: 'SOC 2 & ISO 27001 Compliance Exports',
        text: 'Export tamper-evident PDF/JSON audit bundles directly for compliance auditors with verified non-repudiation timestamps.',
      },
    ],
  },
  'api-overview': {
    category: 'API Reference',
    title: 'REST API v1 Overview',
    subtitle: 'OpenAPI 3.1 specifications, base URLs, headers, and standard error envelopes.',
    items: [
      {
        heading: 'Base URL & Versioning',
        text: 'All requests must target the v1 REST API endpoint over HTTPS:',
        code: 'https://api.Kavach.io/api/v1',
        lang: 'text',
      },
      {
        heading: 'Standard Request Headers',
        text: 'Send authorization and format headers with every HTTP call:',
        code: 'Authorization: Bearer <JWT_ACCESS_TOKEN>\nContent-Type: application/json\nAccept: application/json\nX-Organization-ID: <ORG_UUID>',
        lang: 'http',
      },
      {
        heading: 'Standard JSON Response Envelope',
        text: 'Endpoints return structured responses with machine-readable status codes:',
        code: '{\n  "status": "success",\n  "data": { ... },\n  "request_id": "req_8f1b2c3d4e5f",\n  "timestamp": "2026-10-07T02:00:00Z"\n}',
        lang: 'json',
      },
    ],
  },
  'api-projects': {
    category: 'API Reference',
    title: 'Projects & Workspaces API',
    subtitle: 'Create organizations, workspaces, and link git repositories.',
    items: [
      {
        heading: 'POST /api/v1/organizations',
        text: 'Registers a new tenant organization in PostgreSQL:',
        code: 'POST /api/v1/organizations HTTP/1.1\nContent-Type: application/json\n\n{\n  "name": "Acme Security Labs",\n  "slug": "acme-security-labs",\n  "industry": "Software & Cloud Services",\n  "region": "Asia Pacific (Mumbai)"\n}',
        lang: 'http',
      },
      {
        heading: 'POST /api/v1/workspaces',
        text: 'Creates an isolated workspace under an organization:',
        code: 'POST /api/v1/workspaces HTTP/1.1\nContent-Type: application/json\n\n{\n  "name": "Production Core",\n  "organization_id": "7d2f4810-72c0-43b6-9bb2-1279a0e66c1b",\n  "visibility": "Private",\n  "deployment_target": "Kubernetes"\n}',
        lang: 'http',
      },
      {
        heading: 'GET /api/v1/workspaces',
        text: 'Returns persisted workspaces filtered by organization ID:',
        code: 'GET /api/v1/workspaces?organization_id=7d2f4810-72c0-43b6-9bb2-1279a0e66c1b HTTP/1.1',
        lang: 'http',
      },
    ],
  },
  'api-scans': {
    category: 'API Reference',
    title: 'Scans & Findings API',
    subtitle: 'Trigger scans, query vulnerability findings, and retrieve verification artifacts.',
    items: [
      {
        heading: 'POST /api/v1/scans',
        text: 'Launches asynchronous scanning job against target repository path:',
        code: 'POST /api/v1/scans HTTP/1.1\nContent-Type: application/json\n\n{\n  "project_id": "prj_91e0821c",\n  "scan_types": ["sast", "secrets", "container"],\n  "branch": "main"\n}',
        lang: 'http',
      },
      {
        heading: 'GET /api/v1/findings',
        text: 'Queries persisted security findings filtered by severity and status:',
        code: 'GET /api/v1/findings?project_id=prj_91e0821c&severity=CRITICAL&status=OPEN HTTP/1.1',
        lang: 'http',
      },
      {
        heading: 'POST /api/v1/findings/{id}/remediate',
        text: 'Proposes an LLM-assisted patch diff and queues deterministic re-scanning validation:',
        code: 'POST /api/v1/findings/fnd_38b91a/remediate HTTP/1.1\nContent-Type: application/json\n\n{\n  "strategy": "least_privilege_remediation"\n}',
        lang: 'http',
      },
    ],
  },
  'api-protect': {
    category: 'API Reference',
    title: 'Protect & Enforcement API',
    subtitle: 'Evaluate OPA delivery contracts, intercept runtime anomalies, and manage approvals.',
    items: [
      {
        heading: 'POST /api/v1/protect/evaluate',
        text: 'Evaluates delivery gates against commit payload with deterministic Rego engine:',
        code: 'POST /api/v1/protect/evaluate HTTP/1.1\nContent-Type: application/json\n\n{\n  "commit_sha": "a1b2c3d4e5f67890",\n  "repository": "acme/backend-service",\n  "environment": "Production"\n}',
        lang: 'http',
      },
      {
        heading: 'POST /api/v1/protect/block-event',
        text: 'Triggers real-time eBPF network quarantine or container process termination:',
        code: 'POST /api/v1/protect/block-event HTTP/1.1\nContent-Type: application/json\n\n{\n  "container_id": "k8s_pod_core_backend",\n  "threat_type": "UNAUTHORIZED_SYSCALL_EXECVE",\n  "action": "TERMINATE_CONTAINER"\n}',
        lang: 'http',
      },
    ],
  },
};

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState('quickstart');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredSections = DOC_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((sec) => sec.items.length > 0);

  const activeContent = DOC_DETAILS[activeDoc] || DOC_DETAILS['quickstart'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <KavachHeader />

      {/* Docs Header Banner */}
      <div style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '36px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#EFF6FF', borderRadius: '16px', color: '#2563EB', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
              <Sparkles size={13} />
              <span>Kavach 2026 Developer Documentation</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Kavach Documentation
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748B', maxWidth: '640px' }}>
              Comprehensive engineering guides, real API specifications, deterministic policy blueprints, and runtime protection architectures.
            </p>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                color: '#0F172A',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Documentation Body */}
      <div style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 24px 64px', display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '48px' }}>
        {/* Left Navigation Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredSections.map((sec) => (
            <div key={sec.id}>
              <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', margin: '0 0 10px 8px' }}>
                {sec.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sec.items.map((item) => {
                  const isActive = activeDoc === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveDoc(item.id)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                        color: isActive ? '#2563EB' : '#475569',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      className={!isActive ? 'hover:bg-slate-50 hover:text-slate-900' : ''}
                    >
                      <span>{item.title}</span>
                      {isActive && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Need Custom Rules?</h4>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
              Write deterministic OPA Rego security contracts for your CI/CD delivery pipelines.
            </p>
            <Link
              href="/onboarding/organization"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <span>Start Onboarding</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </aside>

        {/* Center Main Content */}
        <main style={{ minWidth: 0 }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
              <span>{activeContent.category}</span>
              <span>/</span>
              <span style={{ color: '#2563EB', fontWeight: 600 }}>{activeContent.title}</span>
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', color: '#0F172A', letterSpacing: '-0.02em' }}>
              {activeContent.title}
            </h2>

            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
              {activeContent.subtitle}
            </p>

            {/* Principle Alert Box if present */}
            {activeContent.principle && (
              <div style={{ padding: '16px 20px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '14px', lineHeight: 1.5, marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                  <Shield size={16} color="#2563EB" />
                  <span>Architectural Principle</span>
                </div>
                <div>{activeContent.principle}</div>
              </div>
            )}

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {activeContent.items.map((item, idx) => (
                <div key={idx} style={{ paddingBottom: '24px', borderBottom: idx < activeContent.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
                    {item.heading}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-line' }}>
                    {item.text}
                  </p>

                  {item.code && (
                    <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '16px 18px', position: 'relative', marginTop: '10px' }}>
                      <pre style={{ margin: 0, color: '#38BDF8', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', lineHeight: 1.5 }}>
                        <code>{item.code}</code>
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.code || '', `code-${activeDoc}-${idx}`)}
                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFFFFF', borderRadius: '4px', padding: '6px', cursor: 'pointer' }}
                        title="Copy snippet"
                      >
                        {copiedCode === `code-${activeDoc}-${idx}` ? <Check size={14} color="#4ADE80" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {item.link && (
                    <div style={{ marginTop: '14px' }}>
                      <Link
                        href={item.link.href}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <span>{item.link.label}</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Need help with your integration? View the full API spec or contact support.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link
                  href="/onboarding/organization"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    textDecoration: 'none',
                  }}
                >
                  <span>Open Onboarding</span>
                </Link>
                <Link
                  href="/platform"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#2563EB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    textDecoration: 'none',
                  }}
                >
                  <span>Go to Platform</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
