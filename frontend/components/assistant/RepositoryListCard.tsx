'use client';

import React from 'react';
import { FolderGit2, Check, ExternalLink, GitBranch, Lock, Globe } from 'lucide-react';

interface RepositoryItem {
  id?: string;
  name: string;
  full_name?: string;
  owner?: string;
  default_branch?: string;
  html_url?: string;
  private?: boolean;
}

interface RepositoryListCardProps {
  repositories: RepositoryItem[];
  selectedRepo?: string;
  selectedRepositories?: string[];
  onSelectRepo?: (repoName: string) => void;
  onSelectRepository?: (repo: RepositoryItem) => void;
}

export function RepositoryListCard({
  repositories,
  selectedRepo,
  selectedRepositories,
  onSelectRepo,
  onSelectRepository,
}: RepositoryListCardProps) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 14,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
            }}
          >
            <FolderGit2 size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Connected Repositories ({repositories.length})
            </h4>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Select a repository to run vulnerability scans and security posture evaluations.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {repositories.map((repo) => {
          const isSelected = selectedRepo === repo.name || selectedRepositories?.includes(repo.name) || selectedRepositories?.includes(repo.full_name || '');
          return (
            <div
              key={repo.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
                border: `1px solid ${isSelected ? '#86EFAC' : '#E2E8F0'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {repo.private ? <Lock size={14} color="#64748B" /> : <Globe size={14} color="#64748B" />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {repo.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{repo.full_name || repo.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <GitBranch size={10} />
                      {repo.default_branch || 'main'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isSelected ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#16A34A',
                      backgroundColor: '#DCFCE7',
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                    Active Target
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectRepository) {
                        onSelectRepository(repo);
                      } else if (onSelectRepo) {
                        onSelectRepo(repo.name);
                      }
                    }}
                    style={{
                      padding: '5px 12px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
