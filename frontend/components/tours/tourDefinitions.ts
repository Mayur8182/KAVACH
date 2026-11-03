import React from 'react';
import {
  Shield,
  GitBranch,
  Scan,
  AlertTriangle,
  Sliders,
  Cloud,
  Terminal,
  Cpu,
  FileCheck,
  Lock,
  Layers,
  Sparkles,
  Key,
  Box,
  Container,
  GitPullRequest,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  focusArea: string;
  target?: string; // Primary CSS selector or data-tour attribute
  fallbackTarget?: string; // Fallback CSS selector if primary not on current view
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route?: string; // Route where this step belongs
}

export interface TourConfig {
  id: string;
  name: string;
  module: string;
  subtitle: string;
  steps: TourStep[];
}

export const TOUR_CONFIGS: Record<string, TourConfig> = {
  // ── 1. GLOBAL CONTROL PLANE TOUR (5 ESSENTIAL STEPS) ──
  dashboard_overview: {
    id: 'dashboard_overview',
    name: 'SECULAYER',
    subtitle: 'CONTROL PLANE · PRODUCT TOUR',
    module: 'global',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to SecuLayer Control Plane',
        description:
          'Your unified application security command center. Monitor code repositories, cloud infrastructure, AI agents, and security policies in real-time.',
        focusArea: 'Workspace Command Center',
        route: '/code',
        target: '[data-tour="code-overview-header"]',
        fallbackTarget: '[data-tour="sidebar-workspace"]',
        icon: Shield,
      },
      {
        id: 'repositories',
        title: 'Connect Repositories & Source Control',
        description:
          'Integrate GitHub or GitLab organizations to monitor repositories, check branch protection rules, and run continuous security checks.',
        focusArea: 'Connected Git Repositories',
        route: '/repositories',
        target: '[data-tour="tour-code-repos"]',
        fallbackTarget: '[data-tour="repositories-list"]',
        icon: GitBranch,
      },
      {
        id: 'first_scan',
        title: 'Deterministic SAST & Secret Scans',
        description:
          'Semgrep AST rules and Gitleaks high-entropy scanners run deterministically against every commit with zero synthetic data.',
        focusArea: 'Static Analysis Engines',
        route: '/code/sast',
        target: '[data-tour="tour-code-sast"]',
        fallbackTarget: '[data-tour="scan-action"]',
        icon: Scan,
      },
      {
        id: 'findings',
        title: 'Cryptographic Findings & Evidence',
        description:
          'Inspect verified vulnerabilities, trace source-to-sink AST taint analysis, and review cryptographically signed proof packets.',
        focusArea: 'Findings & Evidence Store',
        route: '/code/findings',
        target: '[data-tour="tour-code-findings"]',
        fallbackTarget: '[data-tour="findings-summary"]',
        icon: AlertTriangle,
      },
      {
        id: 'remediation',
        title: 'Automated Fixes & Policy Control',
        description:
          'Review proposed fixes with signed git diffs and enforce Open Policy Agent (OPA) Rego rules across your entire deployment pipeline.',
        focusArea: 'OPA Policies & Remediation',
        route: '/code/policies',
        target: '[data-tour="tour-code-policies"]',
        fallbackTarget: '[data-tour="settings-action"]',
        icon: Sliders,
      },
    ],
  },

  // ── 2. THING CODE MASTER WALKTHROUGH (10 COMPREHENSIVE STEPS) ──
  thing_code: {
    id: 'thing_code',
    name: 'Code Security',
    subtitle: 'Code Security & Supply Chain',
    module: 'code',
    steps: [
      {
        id: 'code_overview',
        title: 'Code Security Overview',
        description:
          'Continuous security posture score, active repository sync health, background scan progress, and immediate triage alerts for your code.',
        focusArea: 'Security Posture & Repo Sync',
        route: '/code',
        target: '[data-tour="code-overview-header"]',
        fallbackTarget: '[data-tour="tour-code-overview"]',
        icon: LayoutGrid,
      },
      {
        id: 'code_repos',
        title: 'Connected Git Repositories',
        description:
          'Connect GitHub and GitLab organizations, manage branch protection rules, inspect sync health, and trigger on-demand repository scans.',
        focusArea: 'Git Source Control & Webhooks',
        route: '/repositories',
        target: '[data-tour="tour-code-repos"]',
        fallbackTarget: '[data-tour="repositories-list"]',
        icon: GitBranch,
      },
      {
        id: 'code_triage',
        title: 'Critical Findings & Triage',
        description:
          'Interactive triage panel highlighting open Critical and High severity findings. Filter by vulnerability class and jump directly into code traces.',
        focusArea: 'Critical Severity Triage',
        route: '/code',
        target: '[data-tour="findings-summary"]',
        fallbackTarget: '[data-tour="tour-code-overview"]',
        icon: AlertTriangle,
      },
      {
        id: 'code_sast',
        title: 'Static Application Security Testing',
        description:
          'Semgrep deterministic AST rule engine scans source code for OWASP Top 10 flaws, tracking taint flows from untrusted inputs to execution sinks.',
        focusArea: 'Semgrep AST Taint Engine',
        route: '/code/sast',
        target: '[data-tour="tour-code-sast"]',
        fallbackTarget: '[data-tour="scan-action"]',
        icon: Scan,
      },
      {
        id: 'code_secrets',
        title: 'Secret & Credential Leak Detection',
        description:
          'Gitleaks high-entropy scanner inspects commits and files for hardcoded API keys, private certificates, AWS tokens, and database credentials.',
        focusArea: 'Gitleaks Entropy Engine',
        route: '/code/secrets',
        target: '[data-tour="tour-code-secrets"]',
        fallbackTarget: '[data-tour="tour-code-sast"]',
        icon: Key,
      },
      {
        id: 'code_dependencies',
        title: 'Software Dependencies & SBOM',
        description:
          'Aqua Trivy and OSV analyze third-party packages, mapping transitive dependency trees, license compliance risks, and exportable CycloneDX SBOMs.',
        focusArea: 'Aqua Trivy & CycloneDX SBOM',
        route: '/code/dependencies',
        target: '[data-tour="tour-code-deps"]',
        fallbackTarget: '[data-tour="findings-summary"]',
        icon: Box,
      },
      {
        id: 'code_containers',
        title: 'Container Security & Dockerfiles',
        description:
          'Audit Dockerfile instructions, base image vulnerabilities, unprivileged execution policies, and container registry security.',
        focusArea: 'Container & Dockerfile Posture',
        route: '/code/container-security',
        target: '[data-tour="tour-code-containers"]',
        fallbackTarget: '[data-tour="tour-code-deps"]',
        icon: Container,
      },
      {
        id: 'code_findings',
        title: 'Security Findings & Evidence Store',
        description:
          'Every vulnerability is backed by deterministic scanner output, exact source file line numbers, and SHA-256 tamper-evident proof packets.',
        focusArea: 'Cryptographic Evidence Store',
        route: '/code/findings',
        target: '[data-tour="tour-code-findings"]',
        fallbackTarget: '[data-tour="findings-summary"]',
        icon: ShieldCheck,
      },
      {
        id: 'code_autofix',
        title: 'Automated Remediation & Fixes',
        description:
          'Review deterministic fix proposals with clean git diff previews. Re-run security test gates to prove the vulnerability is resolved before merging.',
        focusArea: 'Verified Git Patch Diffs',
        route: '/code/autofix',
        target: '[data-tour="tour-code-autofix"]',
        fallbackTarget: '[data-tour="settings-action"]',
        icon: Sparkles,
      },
      {
        id: 'code_prs',
        title: 'Pull Requests & CI/CD Governance',
        description:
          'Shift-left security guardrails enforce OPA Rego policies directly on pull requests, blocking merges when new critical vulnerabilities are introduced.',
        focusArea: 'CI/CD Merge Blocking & OPA',
        route: '/code/pull-requests',
        target: '[data-tour="tour-code-prs"]',
        fallbackTarget: '[data-tour="tour-code-policies"]',
        icon: GitPullRequest,
      },
    ],
  },

  // ── 3. CLOUD MODULE WALKTHROUGH ──
  thing_cloud: {
    id: 'thing_cloud',
    name: 'CLOUD SECURITY',
    subtitle: 'MULTI-CLOUD CSPM & KUBERNETES POSTURE',
    module: 'cloud',
    steps: [
      {
        id: 'cloud_accounts',
        title: 'Cloud Accounts & Inventory',
        description:
          'Connect AWS, GCP, and Azure accounts to continuously map infrastructure assets and identities.',
        focusArea: 'Cloud Accounts',
        target: '[data-tour="cloud-accounts"]',
        icon: Cloud,
      },
      {
        id: 'cloud_posture',
        title: 'CSPM Misconfiguration & Attack Paths',
        description:
          'Detect IAM privilege escalation, open S3 buckets, and unencrypted volumes across cloud accounts.',
        focusArea: 'Cloud Posture',
        target: '[data-tour="cloud-posture"]',
        icon: AlertTriangle,
      },
      {
        id: 'cloud_runtime',
        title: 'Kubernetes & Container Security',
        description:
          'Monitor cluster nodes, pod security policies, and container image reachability in real-time.',
        focusArea: 'Kubernetes Runtime',
        target: '[data-tour="cloud-runtime"]',
        icon: Cpu,
      },
      {
        id: 'cloud_benchmarks',
        title: 'CIS Benchmarks & Compliance',
        description:
          'Audit compliance against CIS Foundations, SOC 2, and ISO 27001 with exportable proof.',
        focusArea: 'Compliance Standards',
        target: '[data-tour="cloud-benchmarks"]',
        icon: FileCheck,
      },
    ],
  },

  // ── 4. ATTACK SURFACE MODULE WALKTHROUGH ──
  thing_attack: {
    id: 'thing_attack',
    name: 'ATTACK SURFACE',
    subtitle: 'ATTACK SURFACE & DAST PENETRATION',
    module: 'attack',
    steps: [
      {
        id: 'attack_assets',
        title: 'External Attack Surface Discovery',
        description:
          'Discover shadow IT, unmanaged DNS records, open ports, and public API endpoints across your domains.',
        focusArea: 'External Domains',
        target: '[data-tour="attack-assets"]',
        icon: Terminal,
      },
      {
        id: 'attack_dast',
        title: 'Automated DAST & Campaign Scans',
        description:
          'Execute OWASP ZAP dynamic application scans against staging and production web interfaces.',
        focusArea: 'DAST Scanner',
        target: '[data-tour="attack-dast"]',
        icon: Scan,
      },
      {
        id: 'attack_reachability',
        title: 'Threat Intel & Exploitability Analysis',
        description:
          'Correlate live CVE exploits (EPSS / CISA KEV) with perimeter reachability to prioritize critical risks.',
        focusArea: 'Threat Intel',
        target: '[data-tour="attack-reachability"]',
        icon: AlertTriangle,
      },
    ],
  },

  // ── 5. RUNTIME DEFENSE MODULE WALKTHROUGH ──
  thing_protect: {
    id: 'thing_protect',
    name: 'RUNTIME DEFENSE',
    subtitle: 'RUNTIME GUARDRAILS & AI AGENT GOVERNANCE',
    module: 'protect',
    steps: [
      {
        id: 'protect_ebpf',
        title: 'Kernel eBPF Behavioral Defense',
        description:
          'Enforce kernel-level blocking of unauthorized network egress, file tampering, and process execution.',
        focusArea: 'Kernel Enforcement',
        target: '[data-tour="protect-ebpf"]',
        icon: Lock,
      },
      {
        id: 'protect_mcp',
        title: 'AI Agent & MCP Tool Proxy',
        description:
          'Every AI tool execution passes through deterministic identity, policy checks, and runtime evidence logging.',
        focusArea: 'MCP Security Gateway',
        target: '[data-tour="protect-mcp"]',
        icon: Layers,
      },
      {
        id: 'protect_incidents',
        title: 'Real-Time Threat Detection & Response',
        description:
          'Inspect automated quarantine actions, privilege rollbacks, and tamper-evident audit trails.',
        focusArea: 'Incident Response',
        target: '[data-tour="protect-incidents"]',
        icon: Shield,
      },
    ],
  },

  // ── 6. COMPLIANCE & GOVERNANCE MODULE WALKTHROUGH ──
  thing_compliance: {
    id: 'thing_compliance',
    name: 'COMPLIANCE & GOVERNANCE',
    subtitle: 'CONTINUOUS AUDIT READINESS & GOVERNANCE',
    module: 'governance',
    steps: [
      {
        id: 'compliance_frameworks',
        title: 'SOC 2, ISO 27001 & HIPAA Controls',
        description:
          'Continuously test required security controls across code, cloud, and organizational policies.',
        focusArea: 'Audit Frameworks',
        target: '[data-tour="compliance-frameworks"]',
        icon: FileCheck,
      },
      {
        id: 'compliance_controls',
        title: 'Deterministic Policy Enforcement',
        description:
          'OPA Rego policies validate pull requests, container deployments, and least-privilege role assignments.',
        focusArea: 'OPA Rego Policies',
        target: '[data-tour="compliance-controls"]',
        icon: Sliders,
      },
      {
        id: 'compliance_export',
        title: 'Auditor-Ready Evidence Packages',
        description:
          'Export cryptographically signed evidence packets for external security auditors in one click.',
        focusArea: 'Evidence Packages',
        target: '[data-tour="compliance-export"]',
        icon: Sparkles,
      },
    ],
  },
};
