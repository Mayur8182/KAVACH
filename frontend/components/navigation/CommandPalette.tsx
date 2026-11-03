'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Code2,
  Cloud,
  Crosshair,
  ShieldCheck,
  Bot,
  Database,
  CheckSquare,
  Lock,
  ArrowRight,
  ShieldAlert,
  Sliders,
  FileCheck,
  Activity,
  GitFork,
  ExternalLink,
  Sparkles,
  Command,
} from 'lucide-react';
import { CANONICAL_ROUTES, RouteContract, OwnershipDomain } from '@/types/navigation/routeRegistry';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { useAccessControl } from '@/lib/hooks/useAccessControl';

const DOMAIN_ICONS: Record<OwnershipDomain, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  CODE: Code2,
  CLOUD: Cloud,
  PROTECT: ShieldCheck,
  AGENT: Bot,
  ATTACK: Crosshair,
  DATA: Database,
  QA: CheckSquare,
  GOVERNANCE: FileCheck,
  PLATFORM: Sliders,
};

const DOMAIN_COLORS: Record<OwnershipDomain, { text: string; bg: string; border: string }> = {
  CODE: { text: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1' },
  CLOUD: { text: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
  PROTECT: { text: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  AGENT: { text: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ATTACK: { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  DATA: { text: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5' },
  QA: { text: '#0F172A', bg: '#F1F5F9', border: '#E2E8F0' },
  GOVERNANCE: { text: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
  PLATFORM: { text: '#334155', bg: '#F1F5F9', border: '#CBD5E1' },
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { isProductEnabled } = useEntitlements();
  const { hasPermission } = useAccessControl();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const categories = ['ALL', 'CODE', 'CLOUD', 'PROTECT', 'AGENT', 'ATTACK', 'DATA', 'GOVERNANCE'];

  // Index canonical routes
  const indexedRoutes = useMemo(() => {
    return Object.values(CANONICAL_ROUTES).map((route) => {
      const isEntitled = route.product === 'platform' || isProductEnabled(route.product);
      const isAuthorized = hasPermission(route.requiredPermission);
      return {
        ...route,
        isEntitled,
        isAuthorized,
      };
    });
  }, [isProductEnabled, hasPermission]);

  // Filter routes based on query and activeCategory
  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return indexedRoutes.filter((item) => {
      const matchesCategory = activeCategory === 'ALL' || item.ownershipDomain === activeCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const titleMatch = item.navigationLabel.toLowerCase().includes(q);
      const pathMatch = item.path.toLowerCase().includes(q);
      const summaryMatch = item.ownershipSummary.toLowerCase().includes(q);
      const domainMatch = item.ownershipDomain.toLowerCase().includes(q);
      const permissionMatch = item.requiredPermission.toLowerCase().includes(q);
      const aliasMatch = item.aliases?.some((a) => a.toLowerCase().includes(q));

      return titleMatch || pathMatch || summaryMatch || domainMatch || permissionMatch || aliasMatch;
    });
  }, [indexedRoutes, query, activeCategory]);

  // Reset index when filter or query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveCategory('ALL');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredRoutes.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredRoutes.length) % Math.max(1, filteredRoutes.length));
      } else if (e.key === 'Enter' && filteredRoutes[selectedIndex]) {
        e.preventDefault();
        const target = filteredRoutes[selectedIndex];
        router.push(target.path);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredRoutes, selectedIndex, router, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '680px',
          maxWidth: '92vw',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <img
            src="/kavach-cube.png"
            alt="Kavach"
            style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a path, resource, scan or permission (e.g. /code/iac, sast, audit, drift)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flexGrow: 1,
              border: 'none',
              background: 'transparent',
              color: '#0F172A',
              fontSize: '14.5px',
              fontWeight: 500,
              outline: 'none',
              padding: 0,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              color: '#94A3B8',
              backgroundColor: '#F1F5F9',
              padding: '3px 7px',
              borderRadius: '5px',
              border: '1px solid #E2E8F0',
            }}
          >
            ESC
          </span>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            overflowX: 'auto',
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #09090B' : '1px solid #E2E8F0',
                  backgroundColor: isActive ? '#09090B' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Route Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '8px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {filteredRoutes.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No canonical routes or security capabilities found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredRoutes.map((route, index) => {
              const isSelected = index === selectedIndex;
              const Icon = DOMAIN_ICONS[route.ownershipDomain] || Sliders;
              const domainColor = DOMAIN_COLORS[route.ownershipDomain] || DOMAIN_COLORS.PLATFORM;

              return (
                <div
                  key={route.id}
                  onClick={() => {
                    router.push(route.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                    marginBottom: '2px',
                    border: isSelected ? '1px solid #E2E8F0' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: domainColor.bg,
                        border: `1px solid ${domainColor.border}`,
                        color: domainColor.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: isSelected ? '#0F172A' : '#1E293B',
                          }}
                        >
                          {route.navigationLabel}
                        </span>
                        <code
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            backgroundColor: '#F8FAFC',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {route.path}
                        </code>
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '380px',
                          marginTop: '2px',
                        }}
                      >
                        {route.ownershipSummary}
                      </div>
                    </div>
                  </div>

                  {/* Status & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {!route.isEntitled && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Lock size={10} />
                        LOCKED
                      </span>
                    )}

                    {!route.isAuthorized && route.isEntitled && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: '#FFFBEB',
                          color: '#D97706',
                          border: '1px solid #FDE68A',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <ShieldAlert size={10} />
                        {route.requiredPermission}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: domainColor.text,
                        backgroundColor: domainColor.bg,
                        border: `1px solid ${domainColor.border}`,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {route.ownershipDomain}
                    </span>

                    {isSelected && <ArrowRight size={14} color="#09090B" style={{ marginLeft: '4px' }} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span>
              <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '1px 4px', borderRadius: '3px' }}>↑</kbd>{' '}
              <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '1px 4px', borderRadius: '3px' }}>↓</kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '1px 4px', borderRadius: '3px' }}>↵</kbd>{' '}
              to select
            </span>
            <span>
              <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '1px 4px', borderRadius: '3px' }}>ESC</kbd>{' '}
              to dismiss
            </span>
          </div>

          <span style={{ fontWeight: 500, color: '#94A3B8' }}>
            {filteredRoutes.length} canonical routes indexed
          </span>
        </div>
      </div>
    </div>
  );
};
