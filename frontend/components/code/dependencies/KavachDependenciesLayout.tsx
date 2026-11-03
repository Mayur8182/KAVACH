'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Boxes,
  ChevronDown,
  RefreshCw,
  PlaySquare,
  FileDown,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  GitBranch,
  Layers,
  ShieldAlert,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export interface KavachDependenciesLayoutProps {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function KavachDependenciesLayout({
  children,
  headerAction,
}: KavachDependenciesLayoutProps) {
  const pathname = usePathname() || '/code/dependencies';
  const router = useRouter();

  const { currentProject, currentRepository, setCurrentRepository, repositories } = useScope();

  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  // Close repo dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(event.target as Node)) {
        setIsRepoDropdownOpen(false);
      }
    }
    if (isRepoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isRepoDropdownOpen]);

  // Primary 15 Sub-Dashboard Navigation Tabs
  const dependencyTabs = [
    { id: 'overview', label: 'Overview', href: '/code/dependencies' },
    { id: 'inventory', label: 'Inventory', href: '/code/dependencies/inventory' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', href: '/code/dependencies/vulnerabilities' },
    { id: 'versions', label: 'Versions & Upgrades', href: '/code/dependencies/versions' },
    { id: 'ecosystems', label: 'Ecosystems', href: '/code/dependencies/ecosystems' },
    { id: 'graph', label: 'Dependency Graph', href: '/code/dependencies/graph' },
    { id: 'licenses', label: 'License Compliance', href: '/code/dependencies/licenses' },
    { id: 'health', label: 'Package Health', href: '/code/dependencies/health' },
    { id: 'remediation', label: 'Remediation Queue', href: '/code/dependencies/remediation' },
    { id: 'sbom', label: 'SBOM', href: '/code/dependencies/sbom' },
    { id: 'policies', label: 'Policies', href: '/code/dependencies/policies' },
    { id: 'ci-cd', label: 'CI/CD Checks', href: '/code/dependencies/ci-cd' },
    { id: 'scans', label: 'Scans & Jobs', href: '/code/dependencies/scans' },
    { id: 'reports', label: 'Reports', href: '/code/dependencies/reports' },
    { id: 'settings', label: 'Settings', href: '/code/dependencies/settings' },
  ];

  // Helper to test if tab is active
  const isTabActive = (tabHref: string) => {
    if (tabHref === '/code/dependencies') {
      return (
        pathname === '/code/dependencies' ||
        pathname === '/dependencies' ||
        pathname.startsWith('/code/dependencies/trends') ||
        pathname.startsWith('/code/dependencies/critical') ||
        pathname.startsWith('/code/dependencies/outdated') ||
        pathname.startsWith('/code/dependencies/coverage')
      );
    }
    return pathname.startsWith(tabHref);
  };

  // Real scan execution against backend
  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const targetRepo = currentRepository?.name || 'All Repositories';
      const res = await api.request<any>('/api/v1/dependencies/scans/run', {
        method: 'POST',
        body: JSON.stringify({
          repository_name: targetRepo,
          scan_type: 'Full SCA Scan',
          project_id: currentProject?.id,
        }),
      });

      const msg = res?.data?.message || `SCA dependency scan initiated for ${targetRepo}.`;
      toast.success('Dependency scan queued', { description: msg });
      setScanMessage(msg);
    } catch (err: any) {
      toast.error('Scan trigger failed', { description: err?.message || 'Could not queue scan.' });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        minHeight: 0,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
    >
      {/* ── 1. Top Context Header Bar (Target Switcher & Quick Actions) ── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Repository Target Context Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }} ref={repoDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: '#09090B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <Boxes size={12} />
              </div>
              <span>{currentRepository?.name || 'All Repositories'}</span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                {currentRepository ? 'repo scope' : `(${repositories?.length || 0} repos)`}
              </span>
              <ChevronDown size={13} color="#64748B" />
            </button>

            {/* Target Dropdown Menu */}
            {isRepoDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '280px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 60,
                  padding: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#64748B',
                    padding: '6px 8px 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Select Scanned Target
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentRepository(null);
                    setIsRepoDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: !currentRepository ? '#F1F5F9' : 'transparent',
                    color: !currentRepository ? '#09090B' : '#0F172A',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  <span>All Repositories</span>
                  <span style={{ fontSize: '10px', color: '#64748B', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                    Global
                  </span>
                </button>
                {repositories?.map((r) => {
                  const isSel = currentRepository?.id === r.id || currentRepository?.name === r.name;
                  return (
                    <button
                      key={r.id || r.name}
                      type="button"
                      onClick={() => {
                        setCurrentRepository(r);
                        setIsRepoDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSel ? '#F1F5F9' : 'transparent',
                        color: isSel ? '#09090B' : '#0F172A',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                        {r.default_branch || 'main'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Module Identity Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            <span>SCA &amp; Supply Chain Security</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerAction || (
            <>
              <Link
                href="/code/dependencies/sbom"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <FileDown size={14} color="#64748B" />
                <span>Export SBOM</span>
              </Link>

              <button
                type="button"
                onClick={handleTriggerScan}
                disabled={isScanning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#09090B',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  opacity: isScanning ? 0.7 : 1,
                  transition: 'background-color 0.15s',
                }}
              >
                <PlaySquare size={14} />
                <span>{isScanning ? 'Queuing Scan...' : 'Run SCA Scan'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. Main Dashboard Workspace Content ── */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>{children}</div>
    </div>
  );
}

export default KavachDependenciesLayout;
