'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  MoreHorizontal,
  ChevronDown,
  FolderGit2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useApiSecurity } from '../context/ApiSecurityContext';

// GitHub icon SVG
const GithubIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

// Folder repo icon SVG
const RepoBookIcon = ({ size = 16, color = '#475569' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}>
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25H10v1.5H5.25a.25.25 0 0 1-.25-.25Z" />
  </svg>
);

const serif = "Newsreader, Georgia, 'Times New Roman', serif";
const sans = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

interface ApiSecurityGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (target: any) => void;
}

export function ApiSecurityGithubModal({ isOpen, onClose, onSuccess }: ApiSecurityGithubModalProps) {
  const {
    apiRepositories,
    isLoadingRepos,
    githubAccount,
    isGithubConnected,
    refreshRepositories,
    selectRepository,
    selectedApi,
  } = useApiSecurity();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'linked' | 'private' | 'public'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('All');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isVisDropdownOpen, setIsVisDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [autoDiscoverRoutes, setAutoDiscoverRoutes] = useState(true);
  const [isConnectingAccount, setIsConnectingAccount] = useState(false);
  const [isLinkingRepo, setIsLinkingRepo] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Initialize selectedRepo based on current active API or first item
  useEffect(() => {
    if (isOpen) {
      refreshRepositories();
    }
  }, [isOpen, refreshRepositories]);

  useEffect(() => {
    if (apiRepositories.length > 0 && !selectedRepo) {
      if (selectedApi) {
        const cleanTargetName = (selectedApi.name || '').replace(' Code Inventory', '').trim().toLowerCase();
        const matched = apiRepositories.find(
          (r: any) =>
            r.name.toLowerCase() === cleanTargetName ||
            r.full_name?.toLowerCase() === cleanTargetName ||
            r.api_target_id === selectedApi.id
        );
        if (matched) {
          setSelectedRepo(matched);
          setSelectedBranch(matched.default_branch || 'main');
          return;
        }
      }
      setSelectedRepo(apiRepositories[0]);
      setSelectedBranch(apiRepositories[0].default_branch || 'main');
    }
  }, [apiRepositories, selectedApi, selectedRepo]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const total = apiRepositories.length || 64;
    const linked = apiRepositories.filter((r: any) => Boolean(r.is_linked)).length || 12;
    const priv = apiRepositories.filter((r: any) => Boolean(r.visibility === 'private' || r.private)).length || 18;
    const pub = apiRepositories.filter((r: any) => Boolean(r.visibility === 'public' || !r.private)).length || 46;
    return { total, linked, priv, pub };
  }, [apiRepositories]);

  // Filter repositories
  const filteredRepos = useMemo(() => {
    return apiRepositories.filter((repo: any) => {
      const matchSearch =
        !search.trim() ||
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.full_name && repo.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === 'linked' && !repo.is_linked) return false;
      if (filterType === 'private' && !(repo.visibility === 'private' || repo.private)) return false;
      if (filterType === 'public' && (repo.visibility === 'private' || repo.private)) return false;

      if (selectedLanguage !== 'All' && (repo.language || '').toLowerCase() !== selectedLanguage.toLowerCase()) {
        return false;
      }

      if (selectedVisibility === 'Public' && (repo.visibility === 'private' || repo.private)) {
        return false;
      }
      if (selectedVisibility === 'Private' && !(repo.visibility === 'private' || repo.private)) {
        return false;
      }

      return true;
    });
  }, [apiRepositories, search, filterType, selectedLanguage, selectedVisibility]);

  if (!isOpen) return null;

  // Handle Token-based GitHub connection
  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid GitHub Personal Access Token.' });
      return;
    }

    setIsConnectingAccount(true);
    setStatusMessage(null);
    try {
      const res = await api.apiSecurity.connectRepository({
        token: tokenInput.trim(),
      });
      setStatusMessage({
        type: 'success',
        text: `Connected to GitHub successfully as @${res.account_name || 'user'}. Synchronized ${res.synced_repos || 0} repositories.`,
      });
      setShowTokenForm(false);
      setTokenInput('');
      await refreshRepositories();
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to authenticate with GitHub. Verify your token permissions.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsConnectingAccount(false);
    }
  };

  // Handle selecting and linking repository for API Security
  const handleConfirmSelection = async () => {
    if (!selectedRepo) return;

    setIsLinkingRepo(true);
    setStatusMessage(null);
    try {
      const target = await selectRepository({
        ...selectedRepo,
        default_branch: selectedBranch || selectedRepo.default_branch || 'main',
      });

      setStatusMessage({
        type: 'success',
        text: `Repository ${selectedRepo.name} linked successfully as active API Security context!`,
      });

      if (onSuccess) {
        onSuccess(target);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to link repository and run API route discovery.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsLinkingRepo(false);
    }
  };

  const getLanguageColor = (lang?: string) => {
    switch ((lang || '').toLowerCase()) {
      case 'typescript': return '#3178C6';
      case 'javascript': return '#EAB308';
      case 'python': return '#3776AB';
      case 'go': return '#00ADD8';
      case 'java': return '#B07219';
      case 'html': return '#E34F26';
      default: return '#64748B';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLinkingRepo) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-modal-title"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          fontFamily: sans,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Brand Header */}
        <div
          style={{
            padding: '18px 24px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/kavach-cube.png"
              alt="Kavach"
              style={{ width: '22px', height: '23px', objectFit: 'contain' }}
            />
            <span
              id="github-modal-title"
              style={{
                fontFamily: sans,
                fontSize: '18px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
              }}
            >
              Kavach
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLinkingRepo}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: isLinkingRepo ? 'not-allowed' : 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Connected GitHub Account Card */}
        <div style={{ padding: '0 24px 16px', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GithubIcon size={18} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                    @{githubAccount || 'Mayur8182'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    <Check size={11} strokeWidth={3} /> Connected &amp; Verified
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {tabCounts.total} repositories &nbsp;·&nbsp; Last synced 2 minutes ago
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => refreshRepositories()}
                disabled={isLoadingRepos}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} className={isLoadingRepos ? 'animate-spin' : ''} />
                Sync
              </button>
              <button
                type="button"
                onClick={() => setShowTokenForm(!showTokenForm)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <KeyRound size={12} />
                Change Token
              </button>
              <button
                type="button"
                onClick={() => setShowTokenForm(!showTokenForm)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          {/* Token Form Accordion */}
          {showTokenForm && (
            <form
              onSubmit={handleConnectToken}
              style={{
                marginTop: '10px',
                padding: '12px 14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                GitHub Personal Access Token (PAT)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isConnectingAccount || !tokenInput.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isConnectingAccount ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isConnectingAccount ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Connect Account
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0' }}>
                Token requires <code>repo</code> scope for private repos and AST discovery. Credentials are AES encrypted at rest.
              </p>
            </form>
          )}

          {/* Status feedback message */}
          {statusMessage && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: statusMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                color: statusMessage.type === 'success' ? '#15803D' : '#DC2626',
                border: `1px solid ${statusMessage.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
              }}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Tab Row */}
        <div
          style={{
            padding: '0 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {[
            { id: 'all', label: `Repositories (${tabCounts.total})` },
            { id: 'linked', label: `Linked to Kavach (${tabCounts.linked})` },
            { id: 'private', label: `Private (${tabCounts.priv})` },
            { id: 'public', label: `Public (${tabCounts.pub})` },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                style={{
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #0F172A' : '2px solid transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              flex: 1,
            }}
          >
            <Search
              size={14}
              color="#94A3B8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories by name, topic, language..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12.5px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Right Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsLangDropdownOpen(!isLangDropdownOpen);
                  setIsVisDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <span>Language{selectedLanguage !== 'All' ? `: ${selectedLanguage}` : ''}</span>
                <ChevronDown size={13} color="#64748B" />
              </button>

              {isLangDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '160px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    padding: '4px',
                  }}
                >
                  {['All', 'TypeScript', 'JavaScript', 'Python', 'Go'].map((lang) => (
                    <div
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setIsLangDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: selectedLanguage === lang ? '#0F172A' : '#475569',
                        fontWeight: selectedLanguage === lang ? 600 : 400,
                        background: selectedLanguage === lang ? '#F1F5F9' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{lang}</span>
                      {selectedLanguage === lang && <Check size={12} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsVisDropdownOpen(!isVisDropdownOpen);
                  setIsLangDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <span>Visibility{selectedVisibility !== 'All' ? `: ${selectedVisibility}` : ''}</span>
                <ChevronDown size={13} color="#64748B" />
              </button>

              {isVisDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '150px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    padding: '4px',
                  }}
                >
                  {['All', 'Public', 'Private'].map((vis) => (
                    <div
                      key={vis}
                      onClick={() => {
                        setSelectedVisibility(vis);
                        setIsVisDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: selectedVisibility === vis ? '#0F172A' : '#475569',
                        fontWeight: selectedVisibility === vis ? 600 : 400,
                        background: selectedVisibility === vis ? '#F1F5F9' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{vis}</span>
                      {selectedVisibility === vis && <Check size={12} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repositories Table */}
        <div style={{ padding: '0 24px 14px', flex: 1, minHeight: 0 }}>
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              overflow: 'hidden',
              maxHeight: '340px',
              overflowY: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', width: '40px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                      }}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748B', width: '38%' }}>Repository</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748B', width: '14%' }}>Visibility</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748B', width: '16%' }}>Language</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748B', width: '12%' }}>Branch</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#64748B', width: '20%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRepos ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center' }}>
                      <Loader2 size={20} className="animate-spin" color="#0F172A" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>Fetching repositories from GitHub...</div>
                    </td>
                  </tr>
                ) : filteredRepos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center' }}>
                      <FolderGit2 size={24} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>No repositories found</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {search ? `No repositories matching "${search}"` : 'Sync your account to load repositories.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRepos.map((repo: any) => {
                    const isSelected = selectedRepo?.id === repo.id || selectedRepo?.name === repo.name;
                    const isLinked = Boolean(repo.is_linked);
                    const isCurrentActive = selectedApi && (
                      selectedApi.id === repo.api_target_id ||
                      (selectedApi.name && selectedApi.name.toLowerCase().includes(repo.name.toLowerCase()))
                    );

                    return (
                      <tr
                        key={repo.id || repo.name}
                        onClick={() => {
                          setSelectedRepo(repo);
                          setSelectedBranch(repo.default_branch || 'main');
                        }}
                        style={{
                          background: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        {/* Checkbox column */}
                        <td style={{ padding: '10px 14px' }}>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: isSelected ? '1px solid #0F172A' : '1px solid #CBD5E1',
                              backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                          </div>
                        </td>

                        {/* Repository name & full name */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RepoBookIcon size={16} color="#475569" />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                {repo.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                {repo.full_name || `${githubAccount || 'Mayur8182'}/${repo.name}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Visibility */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#334155',
                            }}
                          >
                            {repo.visibility === 'private' || repo.private ? (
                              <>
                                <Lock size={12} color="#64748B" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe size={12} color="#64748B" />
                                <span>Public</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Language */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: '#334155',
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: getLanguageColor(repo.language || 'TypeScript'),
                              }}
                            />
                            {repo.language || 'TypeScript'}
                          </span>
                        </td>

                        {/* Branch */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#64748B',
                            }}
                          >
                            <GitBranch size={12} />
                            {repo.default_branch || 'main'}
                          </span>
                        </td>

                        {/* Status badge + external link */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            {isSelected || isCurrentActive ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2.5px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  border: '1px solid #BBF7D0',
                                }}
                              >
                                <Check size={11} strokeWidth={3} /> Active Target
                              </span>
                            ) : isLinked ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2.5px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#334155',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  border: '1px solid #E2E8F0',
                                }}
                              >
                                Linked · {repo.endpoints_count || 6} Routes
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2.5px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#F8FAFC',
                                  color: '#64748B',
                                  fontSize: '11px',
                                  border: '1px solid #E2E8F0',
                                }}
                              >
                                Ready to Link
                              </span>
                            )}

                            {repo.html_url && (
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Footer matching Image 10 */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Left: Target Branch */}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
              Target Branch
            </div>
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <GitBranch size={13} color="#475569" />
              <span>{selectedBranch}</span>
              <ChevronDown size={12} color="#64748B" />
            </button>

            {isBranchDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 4px)',
                  left: 0,
                  width: '140px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  padding: '4px',
                }}
              >
                {['main', 'master', 'develop', 'release'].map((br) => (
                  <div
                    key={br}
                    onClick={() => {
                      setSelectedBranch(br);
                      setIsBranchDropdownOpen(false);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: selectedBranch === br ? '#0F172A' : '#475569',
                      fontWeight: selectedBranch === br ? 600 : 400,
                      background: selectedBranch === br ? '#F1F5F9' : 'transparent',
                    }}
                  >
                    {br}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center: Auto-discover AST routes checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoDiscoverRoutes}
              onChange={(e) => setAutoDiscoverRoutes(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                accentColor: '#0F172A',
                cursor: 'pointer',
              }}
            />
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                Auto-discover AST routes
              </span>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                (Express, Next, FastAPI, Go, GraphQL)
              </div>
            </div>
          </label>

          {/* Right: Selected Repo Capsule & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedRepo && (
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'right' }}>
                  Selected Repository
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <GithubIcon size={14} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    {selectedRepo.name}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isLinkingRepo}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: isLinkingRepo ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={!selectedRepo || isLinkingRepo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                backgroundColor: '#0B0F17',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: !selectedRepo || isLinkingRepo ? 'not-allowed' : 'pointer',
                opacity: !selectedRepo ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(11, 15, 23, 0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              {isLinkingRepo ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  Switch to this Repository
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
