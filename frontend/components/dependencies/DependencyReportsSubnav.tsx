'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderGit2, GitBranch, Calendar, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api/client';

interface DependencyReportsSubnavProps {
  selectedRepo?: string;
  onSelectRepo?: (repo: string) => void;
  selectedBranch?: string;
  onSelectBranch?: (branch: string) => void;
  selectedTimeframe?: string;
  onSelectTimeframe?: (timeframe: string) => void;
  repositories?: string[];
  branches?: string[];
}

export const DependencyReportsSubnav: React.FC<DependencyReportsSubnavProps> = ({
  selectedRepo = 'all',
  onSelectRepo,
  selectedBranch = 'all',
  onSelectBranch,
  selectedTimeframe = '30d',
  onSelectTimeframe,
  repositories: passedRepos,
  branches: passedBranches,
}) => {
  const pathname = usePathname();
  const [liveRepos, setLiveRepos] = useState<string[]>(passedRepos || []);
  const [liveBranches, setLiveBranches] = useState<string[]>(passedBranches || ['main', 'all']);
  const [timeframes, setTimeframes] = useState<{ id: string; label: string }[]>([
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: '1y', label: 'Last 1 year' },
  ]);

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
          if (opts.timeframes && opts.timeframes.length > 0) {
            setTimeframes(opts.timeframes);
          }
        }
      } catch (err) {
        console.warn('Failed to load filter options', err);
      }
    };
    fetchOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { label: 'Analytics Overview', href: '/code/dependencies/reports', exact: true },
    { label: 'Vulnerability Trends', href: '/code/dependencies/reports/vulnerabilities' },
    { label: 'Upgrade & Remediation Metrics', href: '/code/dependencies/reports/remediation' },
    { label: 'License Reports', href: '/code/dependencies/reports/licenses' },
    { label: 'Repository Comparison', href: '/code/dependencies/reports/repositories' },
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
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Reports &amp; Analytics</span>
      </div>

      {/* ── Title & Global Filter Row matching mockup ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Reports &amp; Analytics
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Gain insights into dependency security, license compliance, and remediation progress across your repositories.
          </p>
        </div>

        {/* Global Controls matching mockup top right */}
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

          {/* Timeframe Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
            <Calendar size={14} color="#64748B" />
            <select
              value={selectedTimeframe}
              onChange={(e) => onSelectTimeframe?.(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#0F172A', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
            >
              {timeframes.map((tf) => (
                <option key={tf.id} value={tf.id}>{tf.label}</option>
              ))}
            </select>
            <ChevronDown size={12} color="#94A3B8" />
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
export default DependencyReportsSubnav;
