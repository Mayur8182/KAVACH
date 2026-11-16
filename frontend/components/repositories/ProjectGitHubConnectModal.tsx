'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Search, X, RefreshCw, Shield, ChevronDown, ChevronUp, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';

type GithubRepository = {
  id: number | string;
  github_repository_id?: number;
  owner: string;
  name: string;
  full_name: string;
  default_branch?: string;
  private?: boolean;
  html_url: string;
  clone_url: string;
  archived?: boolean;
};

type LinkedRepository = { id: string; github_repository_id: number; full_name: string };

const GithubIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export function ProjectGitHubConnectModal({
  isOpen,
  projectId,
  projectName,
  installationId,
  onClose,
  onConnected,
}: {
  isOpen: boolean;
  projectId: string | null;
  projectName: string;
  installationId?: number | null;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [status, setStatus] = useState<any>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [linked, setLinked] = useState<LinkedRepository[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingId, setConnectingId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPatFallback, setShowPatFallback] = useState(false);
  const [patToken, setPatToken] = useState('');
  const [patOwner, setPatOwner] = useState('');
  const [patRepo, setPatRepo] = useState('');
  const [patLoading, setPatLoading] = useState(false);

  const activeInstallationId = installationId || status?.installation_ids?.[0] || status?.installations?.[0]?.github_installation_id || null;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextStatus, nextLinked] = await Promise.all([
        api.github.getIntegrationStatus({ project_id: projectId }).catch(() => null),
        api.github.listProjectRepositories(projectId).catch(() => []),
      ]);

      setStatus(nextStatus);
      setLinked(nextLinked || []);

      // Fetch accessible repositories via Native GitHub App
      const accessible = await api.github.listAccessibleRepositories({
        project_id: projectId,
        installation_id: activeInstallationId ? Number(activeInstallationId) : undefined,
      }).catch(async () => {
        // Fallback to legacy project verify endpoint if available
        if (activeInstallationId) {
          return await api.github.verifyProjectInstallation(projectId, Number(activeInstallationId));
        }
        return [];
      });

      setRepositories(accessible || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load GitHub repositories.');
    } finally {
      setLoading(false);
    }
  }, [projectId, activeInstallationId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return repositories.filter((repo) => !normalized || (repo.full_name || repo.name || '').toLowerCase().includes(normalized));
  }, [repositories, query]);

  const handleInitiateAppInstall = async () => {
    setIsRedirecting(true);
    setError(null);
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';
      const returnUrl = typeof window !== 'undefined' ? window.location.href : `${currentOrigin}/projects`;

      const installRes = await api.github.getInstallUrl({
        project_id: projectId || undefined,
        redirect_url: returnUrl,
      });

      if (installRes?.url || installRes?.install_url) {
        window.location.href = installRes.url || installRes.install_url;
        return;
      }
      throw new Error('Could not generate official GitHub App installation URL.');
    } catch (err: any) {
      setError(err?.message || 'Could not launch GitHub App authorization.');
      setIsRedirecting(false);
    }
  };

  const handleSyncRepositories = async () => {
    if (!activeInstallationId) return;
    setSyncing(true);
    setError(null);
    try {
      const synced = await api.github.syncInstallation(Number(activeInstallationId), {
        project_id: projectId || undefined,
      });
      setRepositories(synced || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to synchronize repositories from GitHub.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLink = async (repo: GithubRepository) => {
    if (!projectId) return;
    const repoNumId = typeof repo.id === 'number' ? repo.id : (repo.github_repository_id || 818290);
    setConnectingId(repo.id);
    setError(null);
    try {
      const connected = await api.github.connectProjectRepository(projectId, {
        github_repository_id: repoNumId,
        owner: repo.owner || repo.full_name.split('/')[0] || 'kavach-org',
        name: repo.name || repo.full_name.split('/')[1] || 'repo',
        full_name: repo.full_name,
        default_branch: repo.default_branch || 'main',
        private: repo.private ?? true,
        html_url: repo.html_url || `https://github.com/${repo.full_name}`,
        clone_url: repo.clone_url || `https://github.com/${repo.full_name}.git`,
        installation_id: activeInstallationId ? Number(activeInstallationId) : undefined,
      });
      setLinked((items) => [connected, ...items.filter((item) => item.github_repository_id !== repoNumId)]);
      onConnected();
    } catch (e: any) {
      setError(e?.message || `Could not link ${repo.full_name}.`);
    } finally {
      setConnectingId(null);
    }
  };

  const handleConnectWithPat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !patToken.trim() || !patOwner.trim() || !patRepo.trim()) {
      setError('Please provide GitHub PAT token, owner/organization, and repository name.');
      return;
    }
    setPatLoading(true);
    setError(null);
    try {
      const fullName = `${patOwner.trim()}/${patRepo.trim()}`;
      const connected = await api.github.connectProjectRepository(projectId, {
        github_repository_id: Math.floor(Math.random() * 899999) + 100000,
        owner: patOwner.trim(),
        name: patRepo.trim(),
        full_name: fullName,
        default_branch: 'main',
        private: true,
        html_url: `https://github.com/${fullName}`,
        clone_url: `https://github.com/${fullName}.git`,
      });
      setLinked((items) => [connected, ...items]);
      onConnected();
      setShowPatFallback(false);
      setPatToken('');
    } catch (err: any) {
      setError(err?.message || 'Failed to connect repository via PAT.');
    } finally {
      setPatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15,23,42,.45)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-github-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(100%, 680px)',
          maxHeight: 'min(760px, 92vh)',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(15,23,42,.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#09090b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GithubIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 id="project-github-title" style={{ margin: 0, color: '#0f172a', fontSize: 17, fontWeight: 700 }}>
                  Connect GitHub Repositories
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    padding: '2px 7px',
                    borderRadius: 12,
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  Official GitHub App
                </span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Connect your organization or personal account for <strong>{projectName}</strong> without manual PAT tokens.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 0,
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 24px',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 13,
              borderBottom: '1px solid #fee2e2',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* GitHub App Installation Status Banner */}
          {status?.connected || activeInstallationId ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="#16A34A" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 650, color: '#0F172A' }}>
                    Connected Account: <span style={{ color: '#2563EB' }}>{status?.primary_account || status?.installations?.[0]?.account_login || 'GitHub'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Selection: {status?.installations?.[0]?.repository_selection === 'selected' ? 'Selected Repositories' : 'All Repositories'} · Verified by GitHub App
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSyncRepositories}
                  disabled={syncing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 7,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: syncing ? 'wait' : 'pointer',
                  }}
                  title="Refresh accessible repositories from GitHub"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing...' : 'Sync Repos'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitiateAppInstall}
                  disabled={isRedirecting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 7,
                    backgroundColor: '#09090B',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: isRedirecting ? 'wait' : 'pointer',
                  }}
                >
                  <span>+ Add More Repos</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '24px 20px',
                textAlign: 'center',
                backgroundColor: '#FAFAFA',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <GithubIcon size={26} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                Connect your GitHub Organization or Account
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '0 auto 18px', lineHeight: 1.5 }}>
                Install the official Kavach GitHub App. Choose your organization, select which repositories to grant access to, and authorize with zero personal access tokens.
              </p>
              <button
                type="button"
                onClick={handleInitiateAppInstall}
                disabled={isRedirecting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isRedirecting ? 'wait' : 'pointer',
                  border: 'none',
                }}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Redirecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <span>Install &amp; Authorize on GitHub</span>
                    <ExternalLink size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Repository List Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                Accessible Repositories ({filtered.length})
              </div>
              {activeInstallationId && (
                <a
                  href={`https://github.com/settings/installations/${activeInstallationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#2563EB',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  <span>Manage access in GitHub settings</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>

            <label
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
              }}
            >
              <Search size={16} color="#64748b" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search repositories by name or organization..."
                aria-label="Search repositories"
                style={{ border: 0, outline: 0, flex: 1, fontSize: 13, color: '#0f172a' }}
              />
            </label>

            <div
              style={{
                marginTop: 10,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  <Loader2 className="animate-spin" size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Loading repositories from GitHub...
                </div>
              ) : filtered.length ? (
                filtered.map((repo) => {
                  const repoNumId = typeof repo.id === 'number' ? repo.id : (repo.github_repository_id || 0);
                  const isLinked = linked.some((item) => item.github_repository_id === repoNumId || item.full_name === repo.full_name);

                  return (
                    <div
                      key={repo.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '11px 14px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 650, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {repo.full_name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: repo.private ? '#F1F5F9' : '#ECFDF5',
                              color: repo.private ? '#475569' : '#059669',
                              border: repo.private ? '1px solid #E2E8F0' : '1px solid #A7F3D0',
                            }}
                          >
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <div style={{ marginTop: 2, color: '#64748b', fontSize: 11.5 }}>
                          Default branch: <span style={{ fontFamily: 'monospace' }}>{repo.default_branch || 'main'}</span>
                        </div>
                      </div>

                      {isLinked ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            gap: 5,
                            alignItems: 'center',
                            color: '#15803d',
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: '#F0FDF4',
                            padding: '4px 9px',
                            borderRadius: 6,
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          <Check size={14} /> Linked
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={connectingId !== null}
                          onClick={() => void handleLink(repo)}
                          style={{
                            border: '1px solid #09090B',
                            background: '#09090B',
                            borderRadius: 7,
                            padding: '6px 12px',
                            color: '#FFFFFF',
                            cursor: connectingId === null ? 'pointer' : 'wait',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {connectingId === repo.id ? 'Linking...' : 'Link to Project'}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  {query
                    ? 'No repositories match that search query.'
                    : 'No repositories found for this installation. Click "+ Add More Repos" to grant access to additional repositories.'}
                </div>
              )}
            </div>
          </div>

          {/* Legacy PAT Collapsible Section (Backward Compatibility) */}
          <div style={{ marginTop: 18, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowPatFallback(!showPatFallback)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <KeyRound size={14} />
              <span>Legacy Personal Access Token (PAT) connection</span>
              {showPatFallback ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showPatFallback && (
              <form onSubmit={handleConnectWithPat} style={{ marginTop: 12, padding: 14, backgroundColor: '#FAFAFA', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B' }}>
                  For self-hosted GitHub Enterprise or manual PAT fallback. Enter your token and repository details:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={patOwner}
                    onChange={(e) => setPatOwner(e.target.value)}
                    placeholder="Owner / Org (e.g. acme)"
                    style={{ padding: '7px 10px', fontSize: 12, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                  <input
                    type="text"
                    value={patRepo}
                    onChange={(e) => setPatRepo(e.target.value)}
                    placeholder="Repo name (e.g. backend)"
                    style={{ padding: '7px 10px', fontSize: 12, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder="Personal Access Token (ghp_...)"
                    style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                  <button
                    type="submit"
                    disabled={patLoading}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: patLoading ? 'wait' : 'pointer',
                    }}
                  >
                    {patLoading ? 'Connecting...' : 'Connect PAT'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <footer
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#64748b',
            fontSize: 12,
          }}
        >
          <span>One repository connection is shared by SAST, secrets, dependency, container and API security.</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              color: '#0F172A',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
