'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OverviewProvider, useOverview } from './OverviewContext';
import { OverviewModals } from './OverviewModals';
import { ChevronDown, GitBranch, Calendar, FolderGit2 } from 'lucide-react';

function OverviewHeader() {
  const pathname = usePathname();
  const {
    repository,
    setRepository,
    branch,
    setBranch,
    dateRange,
    setDateRange,
    repositories,
    branches,
  } = useOverview();

  const getSubpageTitle = () => {
    if (pathname.includes('/trends')) return 'Trends';
    if (pathname.includes('/severity')) return 'Severity';
    if (pathname.includes('/categories')) return 'Categories';
    if (pathname.includes('/recent-findings')) return 'Recent Findings';
    if (pathname.includes('/scan-status')) return 'Scan Status';
    return 'Dashboard';
  };

  const navTabs = [
    { label: 'Overview', href: '/code/overview' },
    { label: 'Trends', href: '/code/overview/trends' },
    { label: 'Severity', href: '/code/overview/severity' },
    { label: 'Categories', href: '/code/overview/categories' },
    { label: 'Recent Findings', href: '/code/overview/recent-findings' },
    { label: 'Scan Status', href: '/code/overview/scan-status' },
  ];

  const dateOptions = [
    'Sep 01, 2026 → Sep 30, 2026',
    'Last 7 days',
    'Last 30 days',
    'Last 90 days',
    'Last 365 days',
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 24px 0 24px' }}>
      {/* Top row: Breadcrumb and Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>CODE SECURITY</span>
          <span>&gt;</span>
          <span style={{ fontWeight: 500 }}>SAST</span>
          <span>&gt;</span>
          <span style={{ fontWeight: 500 }}>Overview</span>
          <span>&gt;</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{getSubpageTitle()}</span>
        </div>

        {/* Global Filters on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Repository Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FolderGit2 size={14} color="#64748B" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              aria-label="Repository filter"
              style={{
                appearance: 'none',
                padding: '6px 28px 6px 30px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1E293B',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All Repositories</option>
              {repositories.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '9px', pointerEvents: 'none' }} />
          </div>

          {/* Branch Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <GitBranch size={13} color="#64748B" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              aria-label="Branch filter"
              style={{
                appearance: 'none',
                padding: '6px 26px 6px 28px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1E293B',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
          </div>

          {/* Date Range Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={13} color="#64748B" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Date range filter"
              style={{
                appearance: 'none',
                padding: '6px 26px 6px 28px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1E293B',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {dateOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Bottom row: Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid transparent' }}>
        {navTabs.map((tab) => {
          const isActive =
            tab.href === '/code/overview'
              ? pathname === '/code/overview'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                paddingBottom: '10px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function SASTOverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverviewProvider>
      <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC' }}>
        <OverviewHeader />
        <main>{children}</main>
        <OverviewModals />
      </div>
    </OverviewProvider>
  );
}
