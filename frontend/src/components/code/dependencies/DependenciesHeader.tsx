'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, RefreshCw, ChevronRight } from 'lucide-react';

interface DependenciesHeaderProps {
  title: string;
  subtitle: string;
  currentSubpage: 'overview' | 'trends' | 'critical' | 'outdated' | 'coverage';
  onRefresh?: () => void;
  isLoading?: boolean;
  selectedTimeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  extraActions?: React.ReactNode;
}

export const DependenciesHeader: React.FC<DependenciesHeaderProps> = ({
  title,
  subtitle,
  currentSubpage,
  onRefresh,
  isLoading = false,
  selectedTimeRange = '30d',
  onTimeRangeChange,
  extraActions,
}) => {
  const pathname = usePathname();

  const subpages = [
    { id: 'overview', label: 'Overview', href: '/code/dependencies' },
    { id: 'trends', label: 'Trends', href: '/code/dependencies/trends' },
    { id: 'critical', label: 'Critical Dependencies', href: '/code/dependencies/critical' },
    { id: 'outdated', label: 'Outdated Packages', href: '/code/dependencies/outdated' },
    { id: 'coverage', label: 'Repository Coverage', href: '/code/dependencies/coverage' },
  ];

  const currentLabel = subpages.find((s) => s.id === currentSubpage)?.label || 'Overview';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* Top row: Breadcrumb, Title & Top Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {/* Breadcrumbs matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
            <Link href="/code/dependencies" style={{ color: '#64748B', textDecoration: 'none' }}>
              Dependencies
            </Link>
            <ChevronRight size={13} color="#94A3B8" />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        </div>

        {/* Right Controls: Date Range Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Date range picker pill matching screenshot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#334155',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Calendar size={15} color="#64748B" />
            <select
              value={selectedTimeRange}
              aria-label="Filter by time range"
              onChange={(e) => onTimeRangeChange?.(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last 1 Year</option>
            </select>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh dependency analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} color="#64748B" />
              <span>Refresh</span>
            </button>
          )}

          {extraActions}
        </div>
      </div>

      {/* Quick Navigation Tabs between the 5 subpages */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        {subpages.map((sub) => {
          const isActive = currentSubpage === sub.id;
          return (
            <Link
              key={sub.id}
              href={sub.href}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {sub.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
