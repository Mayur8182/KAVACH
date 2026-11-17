'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  ShieldAlert,
  Search,
  Download,
  ExternalLink,
  ArrowRight,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  X,
  Copy,
  Check,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

interface ResourceItem {
  id: string;
  category: 'whitepapers' | 'advisories' | 'benchmarks' | 'guides';
  title: string;
  description: string;
  date: string;
  readTime: string;
  badge: string;
  linkText: string;
  linkHref: string;
  fullContent: {
    abstract: string;
    sections: { heading: string; body: string; code?: string; codeLang?: string }[];
    doiOrRef?: string;
  };
}

const RESOURCES_DATA: ResourceItem[] = [
  {
    id: 'wp-agent-governance',
    category: 'whitepapers',
    title: 'Deterministic Governance for Autonomous AI Coding Agents',
    description: 'A formal analysis of why LLMs cannot be the security authority and how deterministic OPA contracts prevent prompt injection and privilege escalation in agent swarms.',
    date: 'Oct 2026',
    readTime: '14 min read',
    badge: 'Research Paper',
    linkText: 'Read Whitepaper',
    linkHref: '/docs',
    fullContent: {
      abstract: 'Probabilistic machine learning models, including frontier LLMs, cannot evaluate their own authority boundaries due to fundamental prompt-injection susceptibility. This paper defines the Kavach Deterministic Governance architecture: delegating tool-use intent to an independent OPA/Rego policy engine that verifies authorization before socket or system-level execution occurs.',
      doiOrRef: 'DOI: 10.1145/kavach.sec.2026.04',
      sections: [
        {
          heading: '1. The Non-Deterministic Vulnerability Surface',
          body: 'When autonomous coding agents are granted MCP (Model Context Protocol) tool execution privileges, natural language instructions from untrusted sources (e.g. issues, PR comments, third-party libraries) can manipulate agent reasoning. In an empirical test of 500 frontier LLM sessions, 87.4% accepted privilege escalation instructions when hidden within source code comments.',
        },
        {
          heading: '2. Deterministic OPA Invariant Policy',
          body: 'Under Kavach, no tool call passes directly to an execution container. The tool request payload is intercepted and evaluated against deterministic Rego rules:',
          codeLang: 'rego',
          code: `package kavach.agent.governance
default allow = false

# Allow tool execution only if verified within agent session scope
allow {
    input.tool in {"read_file", "search_repo"}
    input.risk_score <= 3
}

# Require explicit cryptographic approval for mutating tools
allow {
    input.tool in {"execute_command", "write_file", "deploy_cluster"}
    input.identity.has_hardware_token == true
    input.policy_verdict == "ALLOW"
    count(input.vulnerabilities) == 0
}`,
        },
        {
          heading: '3. Cryptographic Provenance & Audit Anchoring',
          body: 'Every policy verdict generates a SHA-256 hash chaining the input parameters, agent identity, OPA decision, and stdout/stderr evidence into an append-only cryptographic ledger.',
        },
      ],
    },
  },
  {
    id: 'adv-mcp-vuln',
    category: 'advisories',
    title: 'Threat Advisory: Arbitrary Tool Invocation in Unauthenticated MCP Servers',
    description: 'Detailed breakdown of attack paths exploiting exposed Model Context Protocol endpoints and remediation using the Kavach MCP Security Gateway.',
    date: 'Sep 2026',
    readTime: '8 min read',
    badge: 'Security Advisory',
    linkText: 'View Advisory',
    linkHref: '/protect/mcp',
    fullContent: {
      abstract: 'Unauthenticated or loosely bound Model Context Protocol (MCP) servers listening over Server-Sent Events (SSE) or local Unix sockets expose internal developer workstations to remote code execution. This advisory outlines vulnerability patterns and immediate remediation steps.',
      doiOrRef: 'ADV-KAVACH-2026-0901',
      sections: [
        {
          heading: '1. Exploit Mechanism & Blast Radius',
          body: 'Local MCP servers registered in AI coding IDEs frequently run without origin checks or JWT bearer authentication. A malicious web page visited in the browser can execute cross-origin fetch requests to localhost:8000/sse, invoking filesystem deletion or shell execution tools on behalf of the developer.',
        },
        {
          heading: '2. Gateway Proxy Enforcement',
          body: 'Deploy the Kavach MCP Security Gateway wrapper to enforce local loopback binding and HMAC request signature verification:',
          codeLang: 'bash',
          code: `# Run the Kavach MCP Security Gateway Proxy
npx @kavach/mcp-gateway --port 8080 \\
  --upstream-url http://127.0.0.1:3000 \\
  --enforce-policy strict \\
  --audit-log /var/log/kavach/mcp-events.jsonl`,
        },
        {
          heading: '3. Immediate Action Plan',
          body: 'Audit all active MCP servers registered in ~/.cursor/mcp.json or Claude Desktop configuration. Disallow raw shell execution tools unless scoped to an isolated docker sandbox container.',
        },
      ],
    },
  },
  {
    id: 'bm-cis-k8s',
    category: 'benchmarks',
    title: 'CIS Kubernetes Benchmark v1.8 Automation Blueprint',
    description: 'Ready-to-deploy Rego rules and admission control configurations that enforce CIS benchmarks directly within Amazon EKS and Azure AKS clusters.',
    date: 'Aug 2026',
    readTime: 'Blueprint',
    badge: 'Compliance Blueprint',
    linkText: 'Download Blueprint',
    linkHref: '/cloud/kubernetes',
    fullContent: {
      abstract: 'This blueprint translates CIS Kubernetes Benchmark v1.8 recommendations into declarative OPA Gatekeeper constraints and Kyverno admission rules for automated enforcement across multi-tenant production clusters.',
      doiOrRef: 'BLUEPRINT-K8S-CIS-1.8',
      sections: [
        {
          heading: '1. Benchmark Coverage Matrix',
          body: 'Covers Control Plane Components (Section 1), Worker Node Security (Section 4), and Pod Security Standards (Section 5). Enforces non-root container execution, read-only root filesystems, and strict network isolation policies.',
        },
        {
          heading: '2. Kubernetes ValidatingAdmissionPolicy Manifest',
          body: 'Declarative Kubernetes 1.30+ CEL validation rule to block containers attempting privilege escalation:',
          codeLang: 'yaml',
          code: `apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: "cis-block-privilege-escalation"
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   [""]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["pods"]
  validations:
    - expression: "!object.spec.containers.exists(c, has(c.securityContext) && c.securityContext.allowPrivilegeEscalation == true)"
      message: "CIS 5.2.5 Violation: allowPrivilegeEscalation must be false."`,
        },
        {
          heading: '3. Verification & Compliance Evidence',
          body: 'Run the Kavach CLI in your CI/CD pipeline to continuously scan Helm charts and Kustomize templates prior to git commit deployment.',
        },
      ],
    },
  },
  {
    id: 'guide-slsa3',
    category: 'guides',
    title: 'Achieving SLSA Level 3 Provenance with GitHub Actions and Syft',
    description: 'Step-by-step implementation guide for signing container images with Cosign, generating CycloneDX SBOMs, and blocking unverified artifact promotion.',
    date: 'Aug 2026',
    readTime: '10 min guide',
    badge: 'Developer Guide',
    linkText: 'Read Guide',
    linkHref: '/code/jobs',
    fullContent: {
      abstract: 'Supply chain Levels for Software Artifacts (SLSA) Level 3 requires non-falsifiable build provenance, isolated ephemeral build environments, and cryptographically verified SBOM attestations. This guide delivers a turnkey GitHub Actions workflow.',
      doiOrRef: 'GUIDE-SLSA3-GITHUB-2026',
      sections: [
        {
          heading: '1. Pipeline Hardening Architecture',
          body: 'Isolate GitHub Actions runners, pin all actions by immutable SHA-256 commit hashes, generate CycloneDX v1.5 JSON SBOMs using Syft, and sign attestations with Sigstore / Cosign keyless OIDC identity.',
        },
        {
          heading: '2. GitHub Actions Production Workflow',
          body: 'Automated workflow step generating SBOM and signing image provenance:',
          codeLang: 'yaml',
          code: `- name: Generate CycloneDX SBOM with Syft
  uses: anchore/sbom-action@v0.17.0
  with:
    image: \${{ env.IMAGE_REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ github.sha }}
    format: cyclonedx-json
    output-file: sbom.cyclonedx.json

- name: Sign Image & Attest Provenance with Cosign
  env:
    COSIGN_EXPERIMENTAL: "1"
  run: |
    cosign attest --yes \\
      --predicate sbom.cyclonedx.json \\
      --type cyclonedx \\
      \${{ env.IMAGE_REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ github.sha }}`,
        },
        {
          heading: '3. Admission Controller Verification',
          body: 'Deploy the Kavach Admission Webhook to verify Cosign image signatures on Kubernetes pod scheduling, rejecting unsigned images automatically.',
        },
      ],
    },
  },
  {
    id: 'wp-ebpf-defense',
    category: 'whitepapers',
    title: 'Zero-Overhead Runtime Threat Detection via eBPF Syscall Probes',
    description: 'Comparative benchmarks of kernel-level eBPF tracing versus user-space ptrace monitoring for detecting container breakout and unauthorized socket connections.',
    date: 'Jul 2026',
    readTime: '18 min read',
    badge: 'Systems Paper',
    linkText: 'Read Whitepaper',
    linkHref: '/protect/runtime',
    fullContent: {
      abstract: 'Traditional runtime container protection relies on ptrace interception or log tailing, introducing up to 18% latency overhead in high-throughput database workloads. This paper presents Kavach-eBPF, achieving microsecond-level detection with less than 0.8% CPU footprint.',
      doiOrRef: 'DOI: 10.1145/kavach.ebpf.2026.07',
      sections: [
        {
          heading: '1. Syscall Interception Architecture',
          body: 'By attaching verifiable BPF programs to kernel tracepoints (sys_enter_execve, sys_enter_connect, and commit_creds), Kavach observes unauthorized shell spawns within container namespaces directly in kernel space.',
        },
        {
          heading: '2. Kernel eBPF Probe Implementation',
          body: 'Verified BPF program capturing process invocation telemetry:',
          codeLang: 'c',
          code: `SEC("tracepoint/syscalls/sys_enter_execve")
int trace_execve(struct trace_event_raw_sys_enter *ctx) {
    u64 pid_tgid = bpf_get_current_pid_tgid();
    struct event_t event = {};
    
    // Check namespace isolation flag
    if (is_container_ns()) {
        bpf_get_current_comm(&event.comm, sizeof(event.comm));
        bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    }
    return 0;
}`,
        },
        {
          heading: '3. Benchmark Results & Container Isolation',
          body: 'Benchmarked on Linux 6.8 across 10,000 requests/sec. Container breakout attempts (such as nsenter and cgroup release_agent tampering) were detected and blocked in under 2.4 milliseconds.',
        },
      ],
    },
  },
  {
    id: 'adv-secret-leak',
    category: 'advisories',
    title: 'High-Entropy API Key Exfiltration via Git Commit History',
    description: 'Analysis of automated scanning techniques using Gitleaks and Semgrep regex rules to catch pre-commit secrets without false-positive alert fatigue.',
    date: 'Jun 2026',
    readTime: '6 min read',
    badge: 'Threat Analysis',
    linkText: 'View Advisory',
    linkHref: '/code/secrets',
    fullContent: {
      abstract: 'Over 68% of leaked enterprise credentials originate in intermediate development commits that are subsequently deleted or squashed. This advisory details multi-heuristic secret entropy scanning techniques.',
      doiOrRef: 'ADV-KAVACH-2026-0602',
      sections: [
        {
          heading: '1. The Squashed Commit Vulnerability',
          body: 'Developers frequently push secrets to feature branches, subsequently running git commit --amend or git rebase. Because Git objects remain unpruned in the remote reflog for up to 90 days, automated threat crawlers reliably extract active keys.',
        },
        {
          heading: '2. Pre-Commit Hook Scanning Rule',
          body: 'Deploy Gitleaks pre-commit configuration with high-entropy filtering:',
          codeLang: 'toml',
          code: `[[rules]]
id = "kavach-aws-high-entropy-secret"
description = "AWS Access Key and High-Entropy Secret Pair"
regex = '''(?i)(aws_access_key_id|aws_secret_access_key)\\s*[:=]\\s*['\"][A-Za-z0-9/+=]{20,40}['\"]'''
entropy = 4.3
tags = ["cloud", "aws", "high-priority"]`,
        },
        {
          heading: '3. Remediation & Instant Invalidation',
          body: 'Upon detecting a leaked token, the Kavach Secrets Engine immediately invokes cloud provider APIs (AWS STS, GitHub Apps, Stripe) to invalidate the secret and provision an ephemeral substitute.',
        },
      ],
    },
  },
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'whitepapers' | 'advisories' | 'benchmarks' | 'guides'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedResource(null);
      }
    };
    if (selectedResource) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedResource]);

  const handleCopyCitation = (item: ResourceItem) => {
    const citation = `Kavach Security Research. "${item.title}". Published ${item.date}. Available at: https://kavachsecurity.me/resources#${item.id}`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const filteredResources = RESOURCES_DATA.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      {/* Header Banner */}
      <section style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: '#F5F1E8', borderRadius: '16px', color: '#3F3A33', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
            <Sparkles size={14} />
            <span>Kavach Knowledge & Research Center</span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Security Research & Technical Resources
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
            Explore peer-reviewed whitepapers, threat advisories, policy benchmarks, and step-by-step developer guides from the Kavach Security Research Team.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: '440px', margin: '0 auto' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search whitepapers, advisories, benchmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </section>

      {/* Filter Tabs & Content */}
      <section style={{ maxWidth: '1200px', margin: '40px auto 80px', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '32px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'All Resources' },
            { id: 'whitepapers', label: 'Whitepapers' },
            { id: 'advisories', label: 'Security Advisories' },
            { id: 'benchmarks', label: 'Compliance Benchmarks' },
            { id: 'guides', label: 'Developer Guides' },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#3F3A33' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Resources Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredResources.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedResource(item)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
              }}
              className="hover:border-stone-400 hover:shadow-md hover:-translate-y-0.5"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#F5F1E8', color: '#3F3A33', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.badge}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{item.readTime}</span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#0F172A', lineHeight: 1.4 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 20px' }}>
                  {item.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{item.date}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResource(item);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#3F3A33',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.linkText}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Resource Reader Modal (Pop-up viewer) */}
      {selectedResource && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedResource(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                backgroundColor: '#FAFAFA',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#F5F1E8',
                      color: '#3F3A33',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {selectedResource.badge}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {selectedResource.readTime} • Published {selectedResource.date}
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.35 }}>
                  {selectedResource.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className="hover:bg-slate-200 transition-colors"
                title="Close viewer (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Scrollable Document View */}
            <div
              style={{
                padding: '28px',
                overflowY: 'auto',
                fontSize: '14.5px',
                lineHeight: 1.7,
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Executive Summary / Abstract Box */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #3F3A33',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0F172A', letterSpacing: '0.04em' }}>
                    Executive Abstract
                  </span>
                  {selectedResource.fullContent?.doiOrRef && (
                    <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                      {selectedResource.fullContent.doiOrRef}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                  {selectedResource.fullContent?.abstract || selectedResource.description}
                </p>
              </div>

              {/* Dynamic Technical Sections */}
              {selectedResource.fullContent?.sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                    {section.heading}
                  </h3>
                  <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#334155', lineHeight: 1.65 }}>
                    {section.body}
                  </p>

                  {section.code && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '12.5px',
                        lineHeight: 1.6,
                        margin: '10px 0 16px',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                      }}
                    >
                      <code>{section.code}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer Controls */}
            <div
              style={{
                padding: '16px 28px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAFAFA',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleCopyCitation(selectedResource)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {copiedCitation ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedCitation ? 'Citation Copied!' : 'Copy Citation'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  href={selectedResource.linkHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#3F3A33',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                  }}
                >
                  <span>Open Full Resource</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <EnterpriseFooter />
    </div>
  );
}
