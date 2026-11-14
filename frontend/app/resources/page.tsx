'use client';

import React, { useState } from 'react';
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
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              className="hover:border-stone-400"
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
                <Link
                  href={item.linkHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#3F3A33',
                    textDecoration: 'none',
                  }}
                >
                  <span>{item.linkText}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <EnterpriseFooter />
    </div>
  );
}
