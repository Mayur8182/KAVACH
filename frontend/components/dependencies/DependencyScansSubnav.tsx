'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderGit2, GitBranch, Calendar, Play, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api/client';

interface DependencyScansSubnavProps {
  selectedRepo?: string;
  onSelectRepo?: (repo: string) => void;
  selectedBranch?: string;
  onSelectBranch?: (branch: string) => void;
  repositories?: string[];
  branches?: string[];
}

export const DependencyScansSubnav: React.FC<DependencyScansSubnavProps> = ({
  selectedRepo = 'all',
  onSelectRepo,
  selectedBranch = 'all',
  onSelectBranch,
  repositories: passedRepos,
  branches = ['main', 'develop', 'staging', 'all'],
}) => {
  const pathname = usePathname();
  const [liveRepos, setLiveRepos] = useState<string[]>(passedRepos || []);

  useEffect(() => {
    if (passedRepos && passedRepos.length > 0) {
      setLiveRepos(passedRepos);
      return;
    }
    let mounted = true;
    const fetchRepos = async () => {
      try {
        const repos = await api.dependencyScans.getRepositories();
        if (mounted && repos && repos.length > 0) {
          setLiveRepos(repos);
        }
      } catch (err) {
        console.warn('Failed to fetch repositories for subnav', err);
      }
    };
    fetchRepos();
    return () => {
      mounted = false;
    };
  }, [passedRepos]);

  const tabs = [
    { label: 'All Dependency Scans', href: '/code/dependencies/scans', exact: true },
    { label: 'Run New Scan', href: '/code/dependencies/scans/new' },
    { label: 'Scan Detail', href: '/code/dependencies/scans/latest', matchPrefix: '/code/dependencies/scans/' },
    { label: 'Scan History & Logs', href: '/code/dependencies/scans/history' },
    { label: 'Scheduled Scans', href: '/code/dependencies/scans/schedules' },
  ];

  const isTabActive = (tab: typeof tabs[number]) => {
    if (tab.exact) return pathname === tab.href;
    if (tab.href === '/code/dependencies/scans/latest') {
      return (
        pathname.startsWith('/code/dependencies/scans/') &&
        !pathname.endsWith('/new') &&
        !pathname.endsWith('/history') &&
        !pathname.endsWith('/schedules')
      );
    }
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
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Dependency Scans &amp; Jobs</span>
      </div>

      {/* ── Title & Global Filter Row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Dependency Scans &amp; Jobs
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Scan your dependencies for vulnerabilities, license risks, policy violations, and security issues.
          </p>
        </div>

        {/* Filters Top Right matching screenshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Repository Picker */}
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
          </div>

          {/* Branch Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
            <GitBranch size={14} color="#64748B" />
            <select
              value={selectedBranch}
              onChange={(e) => onSelectBranch?.(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#0F172A', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="all">All Branches</option>
              {branches.filter((b) => b !== 'all').map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
            <Calendar size={14} color="#64748B" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>Last 30 Days</span>
            <ChevronDown size={12} color="#94A3B8" />
          </div>

          {/* Run Scan Quick Action */}
          <Link
            href="/code/dependencies/scans/new"
            prefetch={true}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Play size={13} fill="#FFFFFF" />
            <span>+ Run Scan</span>
          </Link>
        </div>
      </div>

      {/* ── Subpage Navigation Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
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
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#2563EB',
                    borderRadius: '2px',
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
