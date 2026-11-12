'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  ShieldAlert,
  FolderGit2,
  Cloud,
  FileCode,
  Layers,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/token';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFinding?: (finding: any) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectFinding }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'findings' | 'repos' | 'cloud' | 'pages'>('all');

  const [liveFindings, setLiveFindings] = useState<any[]>([]);
  const [liveRepos, setLiveRepos] = useState<any[]>([]);
  const [liveCloudAssets, setLiveCloudAssets] = useState<any[]>([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(false);

  const isLoggedIn = typeof window !== 'undefined' && !!getAuthToken();

  const publicProductPages = [
    { id: 'prod-code', type: 'page', category: 'pages', title: 'Code Security (SAST & SCA)', description: 'Static analysis, secret scanning, software supply chain & autofix', href: '/products/code' },
    { id: 'prod-cloud', type: 'page', category: 'pages', title: 'Cloud Security (CSPM & IaC)', description: 'Multi-cloud posture, Kubernetes security, and CIS benchmarks', href: '/products/cloud' },
    { id: 'prod-attack', type: 'page', category: 'pages', title: 'Attack Surface & DAST', description: 'Perimeter discovery, external attack surface & simulations', href: '/products/attack' },
    { id: 'prod-protect', type: 'page', category: 'pages', title: 'Runtime Defense (eBPF & MCP)', description: 'Container runtime defense, eBPF syscalls & MCP gateway', href: '/products/protect' },
    { id: 'prod-agent', type: 'page', category: 'pages', title: 'AI Agent Security & Governance', description: 'Autonomous agent registry, authority ceilings & policy enforcement', href: '/products/agent' },
    { id: 'prod-data', type: 'page', category: 'pages', title: 'Data Security (DSPM)', description: 'Data discovery, sensitive PII classification & shadow stores', href: '/products/data' },
    { id: 'prod-graph', type: 'page', category: 'pages', title: 'Security Graph', description: 'Interactive attack path discovery & blast radius topology', href: '/products/graph' },
    { id: 'prod-intel', type: 'page', category: 'pages', title: 'Threat Intelligence', description: 'Real-time threat feeds, CVE intelligence & actor mapping', href: '/products/intelligence' },
    { id: 'prod-soc', type: 'page', category: 'pages', title: 'Security Operations (SOC)', description: 'Modern security incident response, alerts & playbooks', href: '/products/soc' },
    { id: 'p-demo', type: 'page', category: 'pages', title: 'Kavach Interactive Demo Suite', description: 'Schedule architecture review or live interactive evaluation', href: '/demo' },
    { id: 'p-platform', type: 'page', category: 'pages', title: 'Kavach Platform Architecture', description: 'Deterministic security control plane and lifecycle gates', href: '/platform' },
    { id: 'p-pricing', type: 'page', category: 'pages', title: 'Transparent Enterprise Pricing', description: 'Developer, Team, Business, and Enterprise plans', href: '/pricing' },
    { id: 'p-contact', type: 'page', category: 'pages', title: 'Contact Solutions & Sales', description: 'Connect with security architects and CIRT hotline', href: '/contact' },
  ];

  const platformPages = isLoggedIn ? [
    { id: 'p-code', type: 'page', category: 'pages', title: 'Code Security Workspace', description: 'SAST, SCA, secrets detection, repositories, and remediation', href: '/code' },
    { id: 'p-repos', type: 'page', category: 'pages', title: 'Repositories', description: 'Source code repositories, automated scans, and branches', href: '/code/repositories' },
    { id: 'p-findings', type: 'page', category: 'pages', title: 'Security Findings Hub', description: 'Active code vulnerabilities, triage, and autofix', href: '/code/findings' },
    { id: 'p-cloud', type: 'page', category: 'pages', title: 'Cloud Security Posture (CSPM)', description: 'Multi-cloud assets, IAM, K8s, and CIS compliance', href: '/cloud' },
    { id: 'p-attack', type: 'page', category: 'pages', title: 'Attack Surface & DAST', description: 'External perimeter discovery, dynamic testing, and APIs', href: '/attack' },
    { id: 'p-protect', type: 'page', category: 'pages', title: 'Protect & MCP Runtime Gateway', description: 'Real-time tool policy enforcement and eBPF guardrails', href: '/protect' },
    { id: 'p-agent', type: 'page', category: 'pages', title: 'Agent Governance & Risk', description: 'Autonomous agent registry, authority delegations, and ceilings', href: '/agent' },
    { id: 'p-qa', type: 'page', category: 'pages', title: 'QA & Test Automation Hub', description: 'Nexora QA test suites, browser cloud, and visual diffs', href: '/qa' },
    { id: 'p-settings', type: 'page', category: 'pages', title: 'Organization & Account Settings', description: 'User profile, team RBAC, API keys, and security', href: '/settings' },
  ] : publicProductPages;

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      // Never attempt protected authenticated API calls when unauthenticated
      if (!isLoggedIn) {
        if (active) {
          setIsLoadingBackend(false);
          setLiveFindings([]);
          setLiveRepos([]);
          setLiveCloudAssets([]);
        }
        return;
      }

      setIsLoadingBackend(true);
      try {
        const [findingsRes, reposRes, cloudRes] = await Promise.allSettled([
          api.findings.list({ search: query.trim() || undefined, page_size: 6 }),
          api.code.repositoryHealth({ limit: 6 }),
          api.cloud.assets(),
        ]);

        if (!active) return;

        if (findingsRes.status === 'fulfilled' && findingsRes.value?.items) {
          setLiveFindings(
            findingsRes.value.items.map((f: any) => ({
              id: f.id,
              type: 'finding',
              category: 'findings',
              title: f.title || f.rule_id || 'Security Finding',
              severity: f.severity ? f.severity.charAt(0).toUpperCase() + f.severity.slice(1).toLowerCase() : 'Medium',
              resource: f.repository || f.component || 'codebase',
              location: f.file_path ? `${f.file_path}:${f.line_start || 1}` : undefined,
              tool: f.category || f.scanner_type || 'SAST',
              status: f.status || 'Open',
              href: `/code/findings?q=${encodeURIComponent(f.title || f.id)}`,
            }))
          );
        } else {
          setLiveFindings([]);
        }

        if (reposRes.status === 'fulfilled' && reposRes.value?.items) {
          const q = query.toLowerCase().trim();
          const items = reposRes.value.items.filter((r: any) =>
            !q || (r.repository_name || '').toLowerCase().includes(q) || (r.full_name || '').toLowerCase().includes(q)
          );
          setLiveRepos(
            items.slice(0, 6).map((r: any) => ({
              id: r.repository_id || r.id,
              type: 'repo',
              category: 'repos',
              title: r.repository_name || r.name,
              description: `Branch: ${r.default_branch || 'main'} | Scan: ${r.scan_status || 'READY'}`,
              findingsCount: (r.finding_critical || 0) + (r.finding_high || 0) + (r.finding_medium || 0) + (r.finding_low || 0),
              href: `/code/repositories`,
            }))
          );
        } else {
          setLiveRepos([]);
        }

        const cloudAssetList = cloudRes.status === 'fulfilled' ? (cloudRes.value?.assets || cloudRes.value?.items || []) : [];
        if (cloudAssetList.length > 0) {
          const q = query.toLowerCase().trim();
          const items = cloudAssetList.filter((c: any) =>
            !q || (c.name || '').toLowerCase().includes(q) || (c.asset_type || '').toLowerCase().includes(q)
          );
          setLiveCloudAssets(
            items.slice(0, 6).map((c: any) => ({
              id: c.id,
              type: 'cloud',
              category: 'cloud',
              title: c.name || c.arn || 'Cloud Asset',
              description: `${c.provider?.toUpperCase() || 'CLOUD'} ${c.asset_type || 'Resource'} in ${c.region || 'global'}`,
              severity: c.findings_count > 0 ? (c.critical_findings > 0 ? 'Critical' : 'High') : undefined,
              href: `/cloud/assets`,
            }))
          );
        } else {
          setLiveCloudAssets([]);
        }
      } catch (err) {
        console.error('Failed to search live assets:', err);
      } finally {
        if (active) setIsLoadingBackend(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  const searchableItems = [
    ...liveFindings,
    ...liveRepos,
    ...liveCloudAssets,
    ...platformPages,
  ];

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else if (inputRef.current) inputRef.current.focus();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = searchableItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery =
      query.trim() === '' ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item as any).description?.toLowerCase().includes(query.toLowerCase()) ||
      (item as any).resource?.toLowerCase().includes(query.toLowerCase()) ||
      (item as any).location?.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const getSeverityBadge = (sev?: string) => {
    if (!sev) return null;
    const isCrit = sev === 'Critical';
    const isHigh = sev === 'High';
    const isMed = sev === 'Medium';
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: '4px',
          backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FFFBEB' : '#F1F5F9',
          color: isCrit ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#B45309' : '#475569',
          border: `1px solid ${isCrit ? '#FECACA' : isHigh ? '#FFEDD5' : isMed ? '#FEF3C7' : '#E2E8F0'}`,
        }}
      >
        {sev}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Security Search"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <Search size={20} color="#64748B" aria-hidden="true" />
          <input
            ref={inputRef}
            id="global-search-input"
            aria-label="Search across code, cloud, findings, repositories"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across code, cloud, findings, repositories..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: '#0F172A',
              backgroundColor: 'transparent',
              padding: '2px 0',
            }}
          />
          {isLoadingBackend ? (
            <Loader2 size={16} className="animate-spin text-blue-600" aria-label="Loading search results" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ color: '#94A3B8', padding: '4px', cursor: 'pointer', background: 'transparent', border: 'none' }}
              title="Clear search"
              aria-label="Clear search query"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#F1F5F9',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #CBD5E1',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
          }}
        >
          {(['all', 'findings', 'repos', 'cloud', 'pages'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize: '12px',
                fontWeight: activeCategory === cat ? 600 : 500,
                color: activeCategory === cat ? '#2563EB' : '#475569',
                backgroundColor: activeCategory === cat ? '#EFF6FF' : 'transparent',
                border: `1px solid ${activeCategory === cat ? '#BFDBFE' : 'transparent'}`,
                padding: '3px 10px',
                borderRadius: '6px',
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {cat === 'all' ? 'All Results' : cat}
            </button>
          ))}
          <span
            role="status"
            aria-live="polite"
            style={{ marginLeft: 'auto', fontSize: '11px', color: '#475569', fontWeight: 500 }}
          >
            {filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {/* Results List */}
        <div
          role="region"
          aria-label="Search results"
          tabIndex={0}
          style={{ overflowY: 'auto', padding: '10px 12px', flex: 1, outline: 'none' }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>No matching results</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Try adjusting your search terms or selecting another category.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.type === 'finding' && onSelectFinding) {
                      onSelectFinding(item);
                    } else if (item.href) {
                      router.push(item.href);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#F1F5F9';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                          item.type === 'finding'
                            ? '#FEF2F2'
                            : item.type === 'repo'
                            ? '#EFF6FF'
                            : item.type === 'cloud'
                            ? '#F0FDF4'
                            : '#F8FAFC',
                        color:
                          item.type === 'finding'
                            ? '#DC2626'
                            : item.type === 'repo'
                            ? '#2563EB'
                            : item.type === 'cloud'
                            ? '#16A34A'
                            : '#64748B',
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'finding' && <ShieldAlert size={16} />}
                      {item.type === 'repo' && <FolderGit2 size={16} />}
                      {item.type === 'cloud' && <Cloud size={16} />}
                      {item.type === 'page' && <Layers size={16} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {item.type === 'finding' && (
                          <>
                            <span style={{ color: '#0F172A', fontWeight: 500 }}>{(item as any).resource}</span>
                            <span>•</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{(item as any).location}</span>
                            <span>•</span>
                            <span>{(item as any).tool}</span>
                          </>
                        )}
                        {item.type !== 'finding' && <span>{(item as any).description}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {getSeverityBadge((item as any).severity)}
                    <ArrowRight size={14} color="#94A3B8" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748B',
          }}
        >
          <span>Use &uarr; &darr; to navigate, Enter to view, ESC to dismiss</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>Kavach Search</span>
        </div>
      </div>
    </div>
  );
};
