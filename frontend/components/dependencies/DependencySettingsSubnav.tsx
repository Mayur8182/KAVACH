'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderGit2, GitBranch, MoreHorizontal, ChevronDown, Check, Shield } from 'lucide-react';
import { api } from '@/lib/api/client';

interface DependencySettingsSubnavProps {
  selectedRepo?: string;
  onSelectRepo?: (repo: string) => void;
  selectedBranch?: string;
  onSelectBranch?: (branch: string) => void;
  repositories?: string[];
  branches?: string[];
}

export const DependencySettingsSubnav: React.FC<DependencySettingsSubnavProps> = ({
  selectedRepo = 'all',
  onSelectRepo,
  selectedBranch = 'all',
  onSelectBranch,
  repositories: passedRepos,
  branches: passedBranches,
}) => {
  const pathname = usePathname();
  const [liveRepos, setLiveRepos] = useState<string[]>(passedRepos || []);
  const [liveBranches, setLiveBranches] = useState<string[]>(passedBranches || ['main', 'master', 'all']);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const fetchOptions = async () => {
      try {
        const opts = await api.dependencyReports.getFilterOptions();
        if (mounted && opts) {
          if (opts.repositories && opts.repositories.length > 0) {
            setLiveRepos(opts.repositories);
          }
          if (opts.branches && opts.branches.length > 0) {
            setLiveBranches(opts.branches);
          }
        }
      } catch (err) {
        console.warn('Failed to load filter options for settings subnav', err);
      }
    };
    fetchOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { label: 'General Settings', href: '/code/dependencies/settings', exact: true },
    { label: 'Registry Integrations', href: '/code/dependencies/settings/registries' },
    { label: 'Scanner Configuration', href: '/code/dependencies/settings/scanners' },
    { label: 'Credentials & Permissions', href: '/code/dependencies/settings/access' },
    { label: 'Notifications & Audit', href: '/code/dependencies/settings/audit' },
  ];

  const isTabActive = (tab: typeof tabs[number]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
        <Link href="/code/dependencies" style={{ color: '#64748B', textDecoration: 'none' }} className="hover:text-slate-900">
          Dependencies
        </Link>
        <span>&gt;</span>
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Integrations &amp; Settings</span>
      </div>

      {/* ── Title & Global Controls matching mockup ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Integrations &amp; Settings
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Configure dependency scanning, integrations, permissions, and notifications for your repositories.
          </p>
        </div>

        {/* Global Controls Top Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Repository Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
            <FolderGit2 size={14} color="#64748B" />
            <select
              value={selectedRepo}
              onChange={(e) => onSelectRepo?.(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#0F172A', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="all">All Repositories</option>
              {liveRepos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown size={12} color="#94A3B8" />
          </div>

          {/* Branch Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
            <GitBranch size={14} color="#64748B" />
            <select
              value={selectedBranch}
              onChange={(e) => onSelectBranch?.(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#0F172A', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="all">All Branches</option>
              {liveBranches.filter((b) => b !== 'all').map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronDown size={12} color="#94A3B8" />
          </div>

          {/* More Actions Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#64748B',
              }}
              title="More Actions"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  padding: '6px 0',
                  zIndex: 50,
                  minWidth: '180px',
                }}
              >
                <Link
                  href="/code/dependencies/scans/new"
                  onClick={() => setShowMoreMenu(false)}
                  style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#334155', textDecoration: 'none' }}
                  className="hover:bg-slate-50"
                >
                  Trigger Immediate Scan
                </Link>
                <Link
                  href="/code/dependencies/reports"
                  onClick={() => setShowMoreMenu(false)}
                  style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#334155', textDecoration: 'none' }}
                  className="hover:bg-slate-50"
                >
                  View Reports &amp; Analytics
                </Link>
                <Link
                  href="/code/dependencies/policies"
                  onClick={() => setShowMoreMenu(false)}
                  style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#334155', textDecoration: 'none' }}
                  className="hover:bg-slate-50"
                >
                  View Active Policies
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Subpage Navigation Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 0',
                color: active ? '#2563EB' : '#64748B',
                fontWeight: active ? 600 : 500,
                fontSize: '14px',
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 120ms ease',
              }}
            >
              <span>{tab.label}</span>
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2.5px',
                    backgroundColor: '#2563EB',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
export default DependencySettingsSubnav;
