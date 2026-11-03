'use client';

/**
 * CodeWorkshell — Shared layout wrapper for all Thing Code sub-routes.
 * Renders the product-scoped secondary navigation bar.
 * Consumed by every /code/* page via a client boundary.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';
import {
  Code2,
  FolderGit2,
  Bug,
  ScanLine,
  Package,
  KeyRound,
  FileText,
  GitPullRequest,
  Workflow,
  Bot,
  Wand2,
  ShieldCheck,
  Archive,
  Settings2,
  SlidersHorizontal,
  Layers,
  Box,
  Trash2,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/code', icon: <Code2 size={13} /> },
  { id: 'repositories', label: 'Repositories', href: '/code/repositories', icon: <FolderGit2 size={13} /> },
  { id: 'findings', label: 'Findings', href: '/code/findings', icon: <Bug size={13} /> },
  { id: 'sast', label: 'SAST', href: '/code/sast', icon: <ScanLine size={13} /> },
  { id: 'container-security', label: 'Containers', href: '/code/container-security', icon: <Box size={13} /> },
  { id: 'dependencies', label: 'Dependencies', href: '/code/dependencies', icon: <Package size={13} /> },
  { id: 'secrets', label: 'Secrets', href: '/code/secrets', icon: <KeyRound size={13} /> },
  { id: 'sbom', label: 'SBOM', href: '/code/sbom', icon: <FileText size={13} /> },
  { id: 'pr-reviews', label: 'PR Reviews', href: '/code/pr-reviews', icon: <GitPullRequest size={13} /> },
  { id: 'ci-cd', label: 'CI/CD', href: '/code/ci-cd', icon: <Workflow size={13} /> },
  { id: 'ai-security', label: 'AI Security', href: '/code/ai-security', icon: <Bot size={13} /> },
  { id: 'autofix', label: 'AutoFix', href: '/code/autofix', icon: <Wand2 size={13} /> },
  { id: 'policies', label: 'Policies', href: '/code/policies', icon: <ShieldCheck size={13} /> },
  { id: 'evidence', label: 'Evidence', href: '/code/evidence', icon: <Archive size={13} /> },
  { id: 'configuration', label: 'Configuration', href: '/code/configuration', icon: <SlidersHorizontal size={13} /> },
  { id: 'settings', label: 'Settings', href: '/code/settings', icon: <Settings2 size={13} /> },
];

interface CodeWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const CodeWorkshell: React.FC<CodeWorkshellProps> = ({ children, actions }) => {
  const pathname = usePathname();
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);

  const getActiveId = () => {
    if (pathname === '/code') return 'overview';
    const segment = pathname.replace('/code/', '').split('/')[0];
    return segment || 'overview';
  };

  const activeId = getActiveId();

  const handleWipeData = async () => {
    setIsWiping(true);
    setWipeError(null);
    try {
      await api.code.wipeData();
      setShowWipeModal(false);
      window.location.reload();
    } catch (err: any) {
      setWipeError(err?.message || 'Failed to wipe platform data.');
      setIsWiping(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, backgroundColor: '#F8FAFC' }}>
      {/* ── Minimalist Single-Line Product Sub-Nav (Zero Duplicate Headers) ── */}
      <div
        style={{
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '44px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Left Side: Product Badge & Horizontal Nav Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            height: '100%',
          }}
        >
          {/* Compact Product Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingRight: '12px',
              borderRight: '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code2 size={13} color="white" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Code Security
            </span>
          </div>

          {/* Secondary Nav tabs */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              alignItems: 'center',
              height: '100%',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeId;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 10px',
                    height: '100%',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2563EB' : '#64748B',
                    borderBottom: isActive
                      ? '2px solid #2563EB'
                      : '2px solid transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 120ms ease',
                  }}
                >
                  <span style={{ color: isActive ? '#2563EB' : '#94A3B8' }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side: Clean Slate Reset & Optional Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingLeft: '12px' }}>
          {actions}
          <button
            type="button"
            onClick={() => setShowWipeModal(true)}
            title="Wipe all scans and return to 0-data clean slate"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background 120ms ease',
            }}
          >
            <Trash2 size={12} />
            Clean Slate
          </button>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div style={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        {children}
      </div>

      {/* ── Clean Slate Confirmation Modal ── */}
      {showWipeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} color="#DC2626" />
              </div>
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Reset to Clean Slate?
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                  This will wipe all existing security scans, findings, connected repositories, SBOMs, hotspots, and remediation plans from the database.
                </p>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                  You will start with <strong>0 data</strong>, ready to connect and scan a fresh GitHub repository.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={16} />
              </button>
            </div>

            {wipeError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#B91C1C',
                  marginBottom: '14px',
                }}
              >
                {wipeError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                disabled={isWiping}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#475569',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeData}
                disabled={isWiping}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isWiping ? 'not-allowed' : 'pointer',
                }}
              >
                {isWiping ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Wiping Data...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Confirm Clean Slate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
