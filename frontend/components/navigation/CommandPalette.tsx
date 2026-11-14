'use client';

/**
 * CommandPalette — Kavach Global Quick-Jump & Search
 *
 * API Security modules (all six steps) live here as primary navigation.
 * Additional platform tools, AI Analyst, Policies, Settings also searchable.
 * Opens on: search bar click · Ctrl+K / ⌘K · number keys 1–6 (while open)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Layers,
  ShieldAlert,
  GitFork,
  Wrench,
  FileText,
  Code2,
  Key,
  Boxes,
  Cloud,
  ArrowRight,
  Bot,
  FileCheck2,
  Settings,
  X,
  Activity,
  Lock,
  Cpu,
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Warm ivory palette ───────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  bgWarm:    '#FAFAF8',
  bgHover:   '#F5F3EF',
  bgActive:  '#EFEDE8',
  border:    '#E8E6E1',
  borderSub: '#F0EDE8',
  text:      '#1A1A1A',
  textSub:   '#6B6B6B',
  textMuted: '#9A9A96',
  iconBg:    '#F5F3EF',
  iconBgAct: '#ECEAE5',
  numBg:     '#F5F3EF',
  numBorder: '#E0DDD8',
};

interface PaletteItem {
  num?: number;
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  href: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Primary: 6-step API Security workflow ───────────────────────
  const apiSecurityItems = useMemo<PaletteItem[]>(() => [
    { num: 1, id: 'api-inventory',    label: 'API Inventory',        description: 'Endpoint discovery, protocols & auth boundaries',    icon: Layers,     href: '/api-security/inventory'    },
    { num: 2, id: 'api-analysis',     label: 'Security Analysis',    description: 'AST code audit & live endpoint fuzzing',              icon: ShieldAlert, href: '/api-security/analysis'     },
    { num: 3, id: 'api-findings',     label: 'Findings',             description: 'Detected OWASP API Top 10 vulnerabilities',           icon: Lock,       href: '/api-security/findings'     },
    { num: 4, id: 'api-attack-paths', label: 'Attack Paths',         description: 'Correlated multi-hop lateral exploit chains',         icon: GitFork,    href: '/api-security/attack-paths' },
    { num: 5, id: 'api-remediation',  label: 'Remediation',          description: 'Automated patch synthesis & fix verification',        icon: Wrench,     href: '/api-security/fix-verify'   },
    { num: 6, id: 'api-reports',      label: 'Reports & Compliance', description: 'Executive summaries & compliance exports',            icon: FileText,   href: '/api-security/reports'      },
  ], []);

  // ── Secondary: AI tools & settings ──────────────────────────────
  const toolItems = useMemo<PaletteItem[]>(() => [
    { id: 'api-analyst',   label: 'AI Security Analyst', description: 'Natural-language queries over your API security data', group: 'AI & Configuration', icon: Bot,       href: '/api-security/analyst'   },
    { id: 'api-policies',  label: 'Policies',             description: 'OPA policy rules for API security enforcement',       group: 'AI & Configuration', icon: FileCheck2, href: '/api-security/policies'  },
    { id: 'api-settings',  label: 'API Security Settings',description: 'Scan targets, integrations & notification config',   group: 'AI & Configuration', icon: Settings,  href: '/api-security/settings'  },
  ], []);

  // ── Tertiary: global platform tools ─────────────────────────────
  const platformItems = useMemo<PaletteItem[]>(() => [
    { id: 'plat-code',      label: 'Code Security (SAST)',   group: 'Platform', icon: Code2,  href: '/code'               },
    { id: 'plat-secrets',   label: 'Secrets Detection',      group: 'Platform', icon: Key,    href: '/code/secrets'        },
    { id: 'plat-containers',label: 'Container Security',     group: 'Platform', icon: Boxes,  href: '/container-security' },
    { id: 'plat-cloud',     label: 'Cloud Security (CSPM)',  group: 'Platform', icon: Cloud,  href: '/cloud'               },
    { id: 'plat-protect',   label: 'Runtime Defense',        group: 'Platform', icon: Cpu,    href: '/protect'             },
    { id: 'plat-soc',       label: 'Security Operations',    group: 'Platform', icon: Activity,href: '/soc'               },
  ], []);

  const allItems = useMemo(() => [...apiSecurityItems, ...toolItems, ...platformItems], [apiSecurityItems, toolItems, platformItems]);

  // ── Filtering ────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const visibleApi = useMemo(() =>
    q ? apiSecurityItems.filter(i => i.label.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)) : apiSecurityItems
  , [apiSecurityItems, q]);

  const visibleTools = useMemo(() =>
    toolItems.filter(i => !q || i.label.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
  , [toolItems, q]);

  const visiblePlatform = useMemo(() =>
    q ? platformItems.filter(i => i.label.toLowerCase().includes(q) || (i.group || '').toLowerCase().includes(q)) : []
  , [platformItems, q]);

  const flatVisible = useMemo(() => [...visibleApi, ...visibleTools, ...visiblePlatform], [visibleApi, visibleTools, visiblePlatform]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Focus input when opened, clear on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }

      // Number shortcuts 1–6 when no query
      if (!query && /^[1-6]$/.test(e.key)) {
        const item = apiSecurityItems.find(i => i.num === Number(e.key));
        if (item) { e.preventDefault(); router.push(item.href); onClose(); return; }
      }

      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, flatVisible.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
      if (e.key === 'Enter' && flatVisible[selectedIndex]) {
        e.preventDefault();
        router.push(flatVisible[selectedIndex].href);
        onClose();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, query, flatVisible, selectedIndex, router, onClose, apiSecurityItems]);

  if (!isOpen) return null;

  const navigate = (href: string) => { router.push(href); onClose(); };

  // ── Section renderer ─────────────────────────────────────────────
  const renderItem = (item: PaletteItem, globalIdx: number) => {
    const Icon = item.icon;
    const active = globalIdx === selectedIndex;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigate(item.href)}
        onMouseEnter={() => setSelectedIndex(globalIdx)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          borderRadius: '8px',
          border: 'none',
          background: active ? C.bgActive : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.1s',
          gap: '10px',
        }}
      >
        {/* Icon + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '7px',
            background: active ? C.iconBgAct : C.iconBg,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={14} color={active ? '#1A1A1A' : '#6B6B6B'} strokeWidth={1.8} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: C.text, lineHeight: 1.3 }}>
              {item.label}
            </span>
            {item.description && (
              <span style={{ fontSize: '11.5px', color: C.textMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.description}
              </span>
            )}
          </div>
        </div>

        {/* Right: number badge or arrow */}
        {item.num != null ? (
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 500, color: C.textMuted,
            background: C.numBg, border: `1px solid ${C.numBorder}`,
          }}>
            {item.num}
          </span>
        ) : (
          <ArrowRight size={13} color={C.textMuted} style={{ flexShrink: 0 }} />
        )}
      </button>
    );
  };

  let globalIdx = 0;

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(20,20,20,0.35)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', paddingLeft: 16, paddingRight: 16,
        colorScheme: 'light',
      }}
    >
      {/* Palette panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: C.bg,
          borderRadius: '14px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── Search input row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          borderBottom: `1px solid ${C.borderSub}`,
        }}>
          <Search size={16} color={C.textMuted} style={{ flexShrink: 0 }} strokeWidth={1.8} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Go to..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none', outline: 'none',
              fontSize: '14px', fontWeight: 400,
              color: C.text,
              caretColor: '#1A1A1A',
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
            >
              <X size={14} color={C.textMuted} />
            </button>
          ) : (
            <kbd style={{
              fontSize: '11px', fontWeight: 500, color: C.textMuted,
              background: C.bgWarm, border: `1px solid ${C.border}`,
              padding: '2px 8px', borderRadius: '5px', flexShrink: 0,
              fontFamily: 'inherit',
            }}>
              Ctrl K
            </kbd>
          )}
        </div>

        {/* ── Results ── */}
        <div style={{ overflowY: 'auto', maxHeight: 400 }}>

          {/* API Security section */}
          {visibleApi.length > 0 && (
            <div style={{ padding: '10px 10px 4px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: C.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 6px 6px' }}>
                API Security
              </div>
              {visibleApi.map(item => { const el = renderItem(item, globalIdx); globalIdx++; return el; })}
            </div>
          )}

          {/* AI & Config section */}
          {visibleTools.length > 0 && (
            <div style={{ padding: '8px 10px 4px', borderTop: visibleApi.length > 0 ? `1px solid ${C.borderSub}` : 'none' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: C.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 6px 6px' }}>
                AI & Configuration
              </div>
              {visibleTools.map(item => { const el = renderItem(item, globalIdx); globalIdx++; return el; })}
            </div>
          )}

          {/* Platform section — only shown when searching */}
          {visiblePlatform.length > 0 && (
            <div style={{ padding: '8px 10px 4px', borderTop: `1px solid ${C.borderSub}` }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: C.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 6px 6px' }}>
                Platform
              </div>
              {visiblePlatform.map(item => { const el = renderItem(item, globalIdx); globalIdx++; return el; })}
            </div>
          )}

          {/* Empty state */}
          {flatVisible.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: `1px solid ${C.borderSub}`,
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.bgWarm,
        }}>
          <span style={{ fontSize: '11px', color: C.textMuted }}>Press 1–6 to jump to any module</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([k, v]) => (
              <span key={k} style={{ fontSize: '11px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ fontSize: '10px', background: C.numBg, border: `1px solid ${C.numBorder}`, borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>{k}</kbd>
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
