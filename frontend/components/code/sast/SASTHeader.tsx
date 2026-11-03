'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, RefreshCw, ChevronRight, GitBranch, FolderGit2, Play, Sparkles } from 'lucide-react';

export interface SASTHeaderProps {
  title: string;
  subtitle: string;
  currentSubpage?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  selectedTimeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  selectedRepo?: string;
  onRepoChange?: (repo: string) => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
  extraActions?: React.ReactNode;
}

export const SASTHeader: React.FC<SASTHeaderProps> = ({
  title,
  subtitle,
  currentSubpage = 'overview',
  onRefresh,
  isLoading = false,
  selectedTimeRange = '30d',
  onTimeRangeChange,
  selectedRepo = 'All Repositories',
  onRepoChange,
  selectedBranch = 'main',
  onBranchChange,
  extraActions,
}) => {
  const pathname = usePathname();

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '18px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left: Breadcrumbs + Title + Subtitle */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748B',
              marginBottom: '6px',
            }}
          >
            <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>
              Code Security
            </Link>
            <ChevronRight size={13} color="#94A3B8" />
            <Link href="/code/sast" style={{ color: '#64748B', textDecoration: 'none' }}>
              SAST Analysis Engine
            </Link>
            {currentSubpage !== 'overview' && (
              <>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600, textTransform: 'capitalize' }}>
                  {currentSubpage}
                </span>
              </>
            )}
          </div>

          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        </div>

        {/* Right: Time Range & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Time range selector */}
          {onTimeRangeChange && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '2px',
                fontSize: '12px',
              }}
            >
              {['7d', '30d', '90d', '1y'].map((range) => {
                const isSel = selectedTimeRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => onTimeRangeChange(range)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isSel ? '#0F172A' : 'transparent',
                      color: isSel ? '#FFFFFF' : '#64748B',
                      fontWeight: isSel ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh metrics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 120ms ease',
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  color: '#64748B',
                }}
              />
              <span>Refresh</span>
            </button>
          )}

          {extraActions}
        </div>
      </div>
    </div>
  );
};
