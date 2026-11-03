'use client';

import React from 'react';
import { TopRepoByIssuesItem } from '@/types/api/dependencies';
import { Package, FolderGit2 } from 'lucide-react';

interface TopReposByIssuesListProps {
  repositories: TopRepoByIssuesItem[];
  loading?: boolean;
}

export const TopReposByIssuesList: React.FC<TopReposByIssuesListProps> = ({
  repositories,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '200px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '24px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    );
  }

  const maxIssues = Math.max(...repositories.map((r) => r.issue_count || 0), 1);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '280px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Top Repositories by Dependency Issues
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#64748B',
            backgroundColor: '#F8FAFC',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
          }}
        >
          {repositories.length} Tracked
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
        {repositories.slice(0, 5).map((repo) => {
          const barWidth = Math.max(((repo.issue_count || 0) / maxIssues) * 100, 10);
          return (
            <div key={repo.repository} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderGit2 size={14} color="#64748B" />
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {repo.repository}
                  </span>
                  {repo.critical_count > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#DC2626',
                        backgroundColor: '#FEF2F2',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {repo.critical_count} Crit
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>
                    {repo.issue_count}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    issues
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    backgroundColor: repo.color || '#F87171',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
