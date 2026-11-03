'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check, FolderGit2, GitBranch, ChevronDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

interface RepositoryItem {
  id: string;
  name: string;
  full_name?: string;
  visibility?: string;
  private?: boolean;
  default_branch?: string;
  language?: string;
  updated_at?: string;
}

interface SelectRepositoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: RepositoryItem[];
  selectedRepos: string[];
  onSelectedChange: (repos: string[]) => void;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  onContinue: () => void;
}

export function SelectRepositoriesModal({
  isOpen,
  onClose,
  repositories = [],
  selectedRepos,
  onSelectedChange,
  selectedBranch,
  onBranchChange,
  onContinue,
}: SelectRepositoriesModalProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'private' | 'public'>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const [liveRepos, setLiveRepos] = useState<RepositoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddUrl = async () => {
    if (!repoUrlInput.trim()) return;
    setAddingUrl(true);
    setAddError(null);
    try {
      const res = await api.assistant.addRepoByUrl(repoUrlInput.trim());
      if (res?.repository) {
        const newRepo = res.repository;
        setLiveRepos((prev) => [newRepo, ...prev.filter((r) => r.name !== newRepo.name)]);
        onSelectedChange([newRepo.name]);
        setRepoUrlInput('');
      } else {
        setAddError(res?.error || 'Failed to register repository URL.');
      }
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add repository.');
    } finally {
      setAddingUrl(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (repositories && repositories.length > 0) {
      setLiveRepos(repositories);
      return;
    }
    setIsLoading(true);
    api.assistant
      .getLandingOverview()
      .then((res: any) => {
        if (res?.repositories && res.repositories.length > 0) {
          setLiveRepos(res.repositories);
        } else {
          return api.integrations.getGithubRepos().then((ghRes: any) => {
            if (ghRes?.repositories && ghRes.repositories.length > 0) {
              setLiveRepos(
                ghRes.repositories.map((r: any) => ({
                  id: String(r.id || r.name),
                  name: r.name,
                  full_name: r.full_name || r.name,
                  visibility: r.private ? 'private' : 'public',
                  private: !!r.private,
                  default_branch: r.default_branch || 'main',
                  language: r.language || 'Code',
                  updated_at: r.updated_at || 'Recently',
                }))
              );
            }
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch repositories dynamically in modal:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, repositories]);

  if (!isOpen) return null;

  const repoList = liveRepos.length > 0 ? liveRepos : repositories || [];

  const filteredRepos = repoList.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const isPriv = r.private || r.visibility === 'private';
    const matchesType =
      filterType === 'all' ? true : filterType === 'private' ? isPriv : !isPriv;
    const matchesLang =
      filterLang === 'all' ? true : (r.language || '').toLowerCase() === filterLang.toLowerCase();
    return matchesSearch && matchesType && matchesLang;
  });

  const toggleSelect = (name: string) => {
    if (selectedRepos.includes(name)) {
      if (selectedRepos.length === 1) return; // Keep at least one
      onSelectedChange(selectedRepos.filter((r) => r !== name));
    } else {
      onSelectedChange([...selectedRepos, name]);
    }
  };

  const removeRepo = (name: string) => {
    if (selectedRepos.length > 1) {
      onSelectedChange(selectedRepos.filter((r) => r !== name));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Select repositories
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Add Repository via URL or Git Link */}
        <div style={{ padding: '12px 24px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Add Repository via Git URL
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={repoUrlInput}
              onChange={(e) => setRepoUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="e.g. https://github.com/Mayur8182/KAVACH or owner/repo"
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 7,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={addingUrl || !repoUrlInput.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 14px',
                borderRadius: 7,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: addingUrl || !repoUrlInput.trim() ? 'not-allowed' : 'pointer',
                opacity: addingUrl || !repoUrlInput.trim() ? 0.6 : 1,
              }}
            >
              {addingUrl ? <Loader2 size={13} className="animate-spin" /> : <FolderGit2 size={13} />}
              <span>{addingUrl ? 'Cloning...' : 'Add & Scan'}</span>
            </button>
          </div>
          {addError && (
            <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>
              {addError}
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <Search size={15} color="#64748B" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'private', 'public'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: filterType === t ? '1px solid #0F172A' : '1px solid #E2E8F0',
                    backgroundColor: filterType === t ? '#0F172A' : '#FFFFFF',
                    color: filterType === t ? '#FFFFFF' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Language Selector */}
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#475569',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">Language</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="hcl">HCL</option>
                <option value="dockerfile">Dockerfile</option>
                <option value="yaml">YAML</option>
              </select>

              <span style={{ fontSize: 12, color: '#94A3B8', alignSelf: 'center' }}>
                Last updated
              </span>
            </div>
          </div>
        </div>

        {/* Repositories List */}
        <div style={{ overflowY: 'auto', padding: '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Discovering connected repositories...</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Connecting to GitHub integration...</div>
            </div>
          ) : repoList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <FolderGit2 size={32} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>No Connected Repositories</h4>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Connect your GitHub account or link a project in Repository Management to enable automated scanning.
              </p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748B', fontSize: 13 }}>
              No repositories match the current search filter.
            </div>
          ) : (
            filteredRepos.map((repo) => {
            const isSelected = selectedRepos.includes(repo.name);
            const isPriv = repo.private || repo.visibility === 'private';
            return (
              <div
                key={repo.id || repo.name}
                onClick={() => toggleSelect(repo.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: isSelected ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isSelected ? 'none' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>

                  <GithubIcon size={18} />

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {repo.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                      {isPriv ? 'Private' : 'Public'} • {repo.updated_at || 'Updated recently'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                    }}
                  >
                    {repo.language || 'Code'}
                  </span>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Selected Chips & Branch */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                Selected ({selectedRepos.length})
              </span>
              {selectedRepos.map((name) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0F172A',
                  }}
                >
                  <GithubIcon size={12} />
                  <span>{name}</span>
                  <X size={11} style={{ cursor: 'pointer', color: '#64748B' }} onClick={() => removeRepo(name)} />
                </div>
              ))}
            </div>

            {/* Branch Selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowBranchSelect(!showBranchSelect)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <GitBranch size={13} color="#64748B" />
                <span>{selectedBranch}</span>
                <ChevronDown size={11} color="#64748B" />
              </button>

              {showBranchSelect && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '100%',
                    marginBottom: 6,
                    width: 130,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    zIndex: 10,
                    overflow: 'hidden',
                  }}
                >
                  {['main', 'develop', 'staging'].map((b) => (
                    <div
                      key={b}
                      onClick={() => {
                        onBranchChange(b);
                        setShowBranchSelect(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: selectedBranch === b ? 700 : 500,
                        backgroundColor: selectedBranch === b ? '#F0F9FF' : '#FFFFFF',
                        color: selectedBranch === b ? '#2563EB' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            id="connect-and-continue-btn"
            onClick={onContinue}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Connect and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
