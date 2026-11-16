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
  fullContent?: {
    abstract: string;
    sections: { heading: string; body: string; code?: string }[];
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
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0F172A', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  Executive Abstract
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                  {selectedResource.description}
                </p>
              </div>

              {/* Technical Breakdown Sections */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                  1. Core Architecture & Deterministic Thesis
                </h3>
                <p style={{ margin: '0 0 12px' }}>
                  Security systems cannot delegate authoritative decisions (e.g. merge approval, secrets issuance, branch promotion) to non-deterministic probabilistic models. Under Kavach, every proposal generated by an LLM is intercepted and proven through deterministic Policy Engines (OPA / Rego) and validated compiler AST graphs.
                </p>

                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    fontFamily: 'monospace',
                    fontSize: '12.5px',
                    lineHeight: 1.6,
                    margin: '12px 0 16px',
                  }}
                >
                  <code>
                    package kavach.authz<br />
                    default allow = false<br /><br />
                    allow &#123;<br />
                    &nbsp;&nbsp;input.risk_score &lt;= 3<br />
                    &nbsp;&nbsp;input.policy == &quot;ALLOW&quot;<br />
                    &nbsp;&nbsp;count(input.vulnerabilities) == 0<br />
                    &#125;
                  </code>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                  2. Verifiable Evidence & Implementation
                </h3>
                <p style={{ margin: 0 }}>
                  This research asset provides production-ready rulesets, verified CI/CD merge gates, and threat heuristics deployed across active enterprise repositories. Every action is cryptographically anchored in the immutable audit ledger.
                </p>
              </div>
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
