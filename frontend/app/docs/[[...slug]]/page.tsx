'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  BookOpen,
  Shield,
  Bot,
  Code2,
  Layers,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import {
  DOC_NAVIGATION,
  getDocByPath,
  getAdjacentDocs,
  searchDocs,
} from '@/lib/docs/data';

// Map category IDs to sleek icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'getting-started': BookOpen,
  'security-scanners': Shield,
  'ai-mcp-security': Bot,
  'rest-api': Code2,
  'platform-integrations': Layers,
};

// Formats content by parsing markdown-like **bold**, `code`, and Symptom/Cause/Remediation badges without literal asterisks
const renderFormattedContent = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return null;

        // Strip any residual raw asterisks around prefixes like **Symptom:** or **Cause:**
        const cleanedLine = line.replace(/^\s*\*\*(Symptom|Cause|Remediation):\*\*/i, '$1:');
        const prefixMatch = cleanedLine.match(/^(Symptom|Cause|Remediation):\s*(.*)$/i);
        let prefix = '';
        let rest = cleanedLine;
        if (prefixMatch) {
          prefix = prefixMatch[1] + ': ';
          rest = prefixMatch[2];
        }

        const parts = rest.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

        return (
          <p
            key={lineIdx}
            style={{
              fontSize: '14.5px',
              color: '#334155',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {prefix && (
              <strong
                style={{
                  fontWeight: 650,
                  color: prefix.toLowerCase().startsWith('symptom')
                    ? '#DC2626'
                    : prefix.toLowerCase().startsWith('cause')
                    ? '#D97706'
                    : '#16A34A',
                  marginRight: '6px',
                }}
              >
                {prefix}
              </strong>
            )}
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return (
                  <strong
                    key={partIdx}
                    style={{
                      fontWeight: 650,
                      color: '#0F172A',
                    }}
                  >
                    {boldText}
                  </strong>
                );
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                const codeText = part.slice(1, -1);
                return (
                  <code
                    key={partIdx}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
                      color: '#0F172A',
                    }}
                  >
                    {codeText}
                  </code>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function DocsPage() {
  const pathname = usePathname();
  const currentDoc = useMemo(() => getDocByPath(pathname || '/docs'), [pathname]);
  const adjacent = useMemo(() => getAdjacentDocs(pathname || '/docs'), [pathname]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedMcpCategory, setSelectedMcpCategory] = useState<string>('ALL');
  const [activeTocId, setActiveTocId] = useState<string>('');

  // Search Results
  const searchResults = useMemo(() => searchDocs(searchQuery), [searchQuery]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('docs-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track active TOC subsection on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    currentDoc.subsections.forEach((sub) => {
      const el = document.getElementById(sub.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentDoc]);

  // Method Badge Colors (Neutral + Real Status)
  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case 'GET':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'POST':
        return { bg: '#F4F4F5', text: '#18181B', border: '#E4E4E7' };
      case 'PATCH':
      case 'PUT':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
      case 'DELETE':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
      default:
        return { bg: '#F4F4F5', text: '#18181B', border: '#E4E4E7' };
    }
  };

  // Risk Tier Badges
  const getRiskBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'HIGH':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
      case 'MEDIUM':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'LOW':
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
      default:
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      <SecuLayerHeader />

      {/* Main Documentation Shell */}
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1520px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        {/* =================================================================== */}
        {/* LEFT SIDEBAR: 280px Sticky Navigation                               */}
        {/* =================================================================== */}
        <aside
          style={{
            width: '280px',
            flexShrink: 0,
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            borderRight: '1px solid #E4E4E7',
            padding: '24px 16px 40px',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
          }}
          className="docs-sidebar"
        >
          {/* Documentation Search Bar */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                backgroundColor: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Search size={13} color="#71717A" />
              <input
                id="docs-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  color: '#0F172A',
                }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X size={13} color="#71717A" />
                </button>
              ) : (
                <kbd
                  style={{
                    fontSize: '9.5px',
                    fontFamily: 'monospace',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    backgroundColor: '#F4F4F5',
                    color: '#71717A',
                    border: '1px solid #E4E4E7',
                    lineHeight: 1.2,
                  }}
                >
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Live Search Results Overlay */}
            {searchQuery.trim().length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  left: 0,
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '10px',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
                  zIndex: 50,
                  maxHeight: '380px',
                  overflowY: 'auto',
                  padding: '6px',
                }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((res, idx) => (
                    <Link
                      key={idx}
                      href={res.path}
                      onClick={() => setSearchQuery('')}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: '#0F172A',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
                        {res.category}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '2px' }}>
                        {res.title}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#71717A', lineHeight: 1.4 }}>
                        {res.matchedText}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: '#71717A' }}>
                    No documentation matched &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {DOC_NAVIGATION.map((cat) => {
              const isCollapsed = collapsedCategories[cat.id];
              const Icon = CATEGORY_ICONS[cat.id] || BookOpen;

              return (
                <div key={cat.id}>
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Icon size={14} color="#171717" />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#171717',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {cat.title}
                      </span>
                    </div>
                    {isCollapsed ? <ChevronRight size={13} color="#71717A" /> : <ChevronDown size={13} color="#71717A" />}
                  </button>

                  {/* Category Pages */}
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '8px' }}>
                      {cat.items.map((item) => {
                        const isSelected =
                          pathname === item.path ||
                          (item.path === '/docs' && pathname === '/docs/overview') ||
                          (item.path === '/docs' && pathname === '/docs');

                        return (
                          <Link
                            key={item.id}
                            href={item.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '7px 10px',
                              borderRadius: '7px',
                              fontSize: '13px',
                              fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? '#09090B' : '#71717A',
                              backgroundColor: isSelected ? '#F4F4F5' : 'transparent',
                              borderLeft: isSelected ? '2.5px solid #09090B' : '2.5px solid transparent',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#F4F4F5';
                                e.currentTarget.style.color = '#09090B';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#71717A';
                              }
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: '#F4F4F5',
                                  color: '#09090B',
                                  border: '1px solid #E4E4E7',
                                  flexShrink: 0,
                                  marginLeft: '6px',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* =================================================================== */}
        {/* CENTER ARTICLE: 760–1000px Readable Article                         */}
        {/* =================================================================== */}
        <main
          style={{
            flex: 1,
            maxWidth: '960px',
            padding: '36px 48px 80px',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          {/* Breadcrumb Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              color: '#71717A',
              marginBottom: '16px',
            }}
          >
            <Link href="/docs" style={{ color: '#71717A', textDecoration: 'none' }}>
              Docs
            </Link>
            <span>/</span>
            <span>{currentDoc.category}</span>
            <span>/</span>
            <span style={{ color: '#09090B', fontWeight: 500 }}>{currentDoc.title}</span>
          </div>

          {/* Document Header */}
          <div style={{ marginBottom: '32px' }}>
            {currentDoc.badge && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #E4E4E7',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#09090B',
                  marginBottom: '12px',
                }}
              >
                <span>{currentDoc.badge}</span>
                <span style={{ color: '#71717A' }}>•</span>
                <span style={{ color: '#71717A', fontWeight: 400 }}>{currentDoc.readTime}</span>
              </div>
            )}

            <h1
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: '#09090B',
                letterSpacing: '-0.025em',
                margin: '0 0 12px',
                lineHeight: 1.25,
              }}
            >
              {currentDoc.title}
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: '#52525B',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {currentDoc.description}
            </p>
          </div>

          {/* Subsections Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', marginBottom: '48px' }}>
            {currentDoc.subsections.map((sub) => (
              <section key={sub.id} id={sub.id} style={{ scrollMarginTop: '80px' }}>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#171717',
                    letterSpacing: '-0.015em',
                    margin: '0 0 12px',
                  }}
                >
                  {sub.heading}
                </h2>
                <div style={{ margin: '0 0 4px' }}>
                  {renderFormattedContent(sub.content)}
                </div>

                {/* Callout / Alert */}
                {sub.alert && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      border: '1px solid #E4E4E7',
                      backgroundColor: '#FAFAFA',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    {sub.alert.type === 'security' ? (
                      <ShieldAlert size={18} color="#09090B" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <Info size={18} color="#09090B" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <span>{sub.alert.text}</span>
                  </div>
                )}

                {/* Code Blocks */}
                {sub.codeBlocks &&
                  sub.codeBlocks.map((cb, cbIdx) => {
                    const blockId = `${sub.id}-cb-${cbIdx}`;
                    const isCopied = copiedCode === blockId;

                    return (
                      <div
                        key={cbIdx}
                        style={{
                          marginTop: '16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E4E4E7',
                          borderRadius: '10px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 14px',
                            backgroundColor: '#FAFAFA',
                            borderBottom: '1px solid #E4E4E7',
                            fontSize: '12px',
                            color: '#71717A',
                            fontWeight: 500,
                          }}
                        >
                          <span>{cb.title}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cb.code, blockId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E4E4E7',
                              color: '#09090B',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? <Check size={12} color="#15803D" /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '16px',
                            fontSize: '13px',
                            lineHeight: 1.55,
                            fontFamily: 'monospace',
                            color: '#171717',
                            overflowX: 'auto',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <code>{cb.code}</code>
                        </pre>
                      </div>
                    );
                  })}
              </section>
            ))}
          </div>

          {/* ================================================================= */}
          {/* SPECIAL SECTION: REST API ENDPOINTS LIST                          */}
          {/* ================================================================= */}
          {currentDoc.apiEndpoints && currentDoc.apiEndpoints.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#171717', margin: '0 0 20px' }}>
                Endpoints Reference ({currentDoc.apiEndpoints.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {currentDoc.apiEndpoints.map((ep, epIdx) => {
                  const badgeStyle = getMethodBadgeStyle(ep.method);
                  const curlId = `curl-${epIdx}`;
                  const isCopied = copiedCode === curlId;

                  return (
                    <div
                      key={epIdx}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E4E4E7',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      {/* Endpoint Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.text,
                              border: `1px solid ${badgeStyle.border}`,
                              fontFamily: 'monospace',
                            }}
                          >
                            {ep.method}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#09090B' }}>
                            {ep.path}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#71717A',
                            backgroundColor: '#FAFAFA',
                            border: '1px solid #E4E4E7',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Permission: <strong>{ep.permission}</strong>
                        </span>
                      </div>

                      <p style={{ fontSize: '13.5px', color: '#52525B', margin: '0 0 16px', lineHeight: 1.5 }}>
                        {ep.summary}
                      </p>

                      {/* Parameters Table */}
                      {ep.parameters && ep.parameters.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ fontSize: '12px', color: '#09090B', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Parameters:
                          </strong>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E4E4E7', color: '#71717A' }}>
                                <th style={{ padding: '6px 10px' }}>Name</th>
                                <th style={{ padding: '6px 10px' }}>In</th>
                                <th style={{ padding: '6px 10px' }}>Type</th>
                                <th style={{ padding: '6px 10px' }}>Required</th>
                                <th style={{ padding: '6px 10px' }}>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ep.parameters.map((p, pIdx) => (
                                <tr key={pIdx} style={{ borderBottom: '1px solid #F4F4F5' }}>
                                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#09090B' }}>{p.name}</td>
                                  <td style={{ padding: '8px 10px', color: '#71717A' }}>{p.in}</td>
                                  <td style={{ padding: '8px 10px', color: '#71717A' }}>{p.type}</td>
                                  <td style={{ padding: '8px 10px', color: '#09090B' }}>{p.required ? 'Yes' : 'No'}</td>
                                  <td style={{ padding: '8px 10px', color: '#52525B' }}>{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Working cURL Example */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717A', textTransform: 'uppercase' }}>
                            Request Example (cURL)
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ep.curlExample, curlId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#FAFAFA',
                              border: '1px solid #E4E4E7',
                              color: '#09090B',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
                            <span>{isCopied ? 'Copied' : 'Copy cURL'}</span>
                          </button>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            backgroundColor: '#FAFAFA',
                            border: '1px solid #E4E4E7',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: '#09090B',
                            overflowX: 'auto',
                          }}
                        >
                          <code>{ep.curlExample}</code>
                        </pre>
                      </div>

                      {/* Response Examples */}
                      {ep.responses && ep.responses.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            Response ({ep.responses[0].status} {ep.responses[0].description})
                          </span>
                          <pre
                            style={{
                              margin: 0,
                              padding: '12px',
                              backgroundColor: '#FAFAFA',
                              border: '1px solid #E4E4E7',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: '#09090B',
                              overflowX: 'auto',
                            }}
                          >
                            <code>{ep.responses[0].example || 'HTTP 204 No Content'}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SPECIAL SECTION: MCP 22 TOOLS REGISTRY                            */}
          {/* ================================================================= */}
          {currentDoc.mcpTools && currentDoc.mcpTools.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#171717', margin: 0 }}>
                  Registered Tools ({currentDoc.mcpTools.length})
                </h2>

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['ALL', 'PROJECT', 'SECURITY', 'SCANS', 'GITHUB', 'REMEDIATION', 'CLOUD', 'CONTAINER'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedMcpCategory(cat)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: selectedMcpCategory === cat ? '#09090B' : '#FFFFFF',
                        color: selectedMcpCategory === cat ? '#FFFFFF' : '#71717A',
                        border: '1px solid #E4E4E7',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {currentDoc.mcpTools
                  .filter((t) => selectedMcpCategory === 'ALL' || t.category === selectedMcpCategory)
                  .map((tool) => {
                    const riskStyle = getRiskBadgeStyle(tool.riskTier);

                    return (
                      <div
                        key={tool.name}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E4E4E7',
                          borderRadius: '10px',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#09090B' }}>
                              {tool.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '10px',
                                backgroundColor: riskStyle.bg,
                                color: riskStyle.text,
                                border: `1px solid ${riskStyle.border}`,
                              }}
                            >
                              {tool.riskTier} RISK
                            </span>
                          </div>
                          <p style={{ fontSize: '12.5px', color: '#52525B', lineHeight: 1.45, margin: '0 0 10px' }}>
                            {tool.description}
                          </p>
                        </div>
                        <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '8px', fontSize: '11px', color: '#71717A', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Category: <strong>{tool.category}</strong></span>
                          <span>Scope: <strong>{tool.requiredPermission}</strong></span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Bottom Pagination Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              borderTop: '1px solid #E4E4E7',
              paddingTop: '32px',
              marginTop: '48px',
            }}
          >
            {adjacent.prev ? (
              <Link
                href={adjacent.prev.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  color: '#09090B',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <ArrowLeft size={14} />
                <span>{adjacent.prev.title}</span>
              </Link>
            ) : <div />}

            {adjacent.next && (
              <Link
                href={adjacent.next.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <span>{adjacent.next.title}</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </main>

        {/* =================================================================== */}
        {/* RIGHT TOC: 200px "On This Page"                                     */}
        {/* =================================================================== */}
        <aside
          style={{
            width: '200px',
            flexShrink: 0,
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            padding: '36px 16px 40px',
            boxSizing: 'border-box',
          }}
          className="docs-toc"
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#09090B',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            On This Page
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            {currentDoc.subsections.map((sub) => {
              const isActive = activeTocId === sub.id;

              return (
                <a
                  key={sub.id}
                  href={`#${sub.id}`}
                  style={{
                    color: isActive ? '#09090B' : '#71717A',
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: 'none',
                    lineHeight: 1.4,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#71717A';
                  }}
                >
                  {sub.heading}
                </a>
              );
            })}
          </div>
        </aside>
      </div>

      <EnterpriseFooter />
    </div>
  );
}
