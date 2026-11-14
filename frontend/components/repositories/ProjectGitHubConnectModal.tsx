'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api/client';

type GithubRepository = {
  id: number;
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
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeInstallationId = installationId || status?.installation_ids?.[0] || null;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextStatus, nextLinked] = await Promise.all([
        api.github.getProjectStatus(projectId),
        api.github.listProjectRepositories(projectId),
      ]);
      setStatus(nextStatus);
      setLinked(nextLinked || []);
      const existingInstallationId = installationId || nextStatus?.installation_ids?.[0];
      if (existingInstallationId) {
        const accessible = await api.github.verifyProjectInstallation(projectId, Number(existingInstallationId));
        setRepositories(accessible || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load GitHub repositories.');
    } finally {
      setLoading(false);
    }
  }, [projectId, installationId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return repositories.filter((repo) => !normalized || repo.full_name.toLowerCase().includes(normalized));
  }, [repositories, query]);

  const handleLink = async (repo: GithubRepository) => {
    if (!projectId || !activeInstallationId) return;
    setConnectingId(repo.id);
    setError(null);
    try {
      const connected = await api.github.connectProjectRepository(projectId, {
        github_repository_id: repo.id,
        owner: repo.owner,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch || 'main',
        private: repo.private ?? true,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        installation_id: Number(activeInstallationId),
      });
      setLinked((items) => [connected, ...items.filter((item) => item.github_repository_id !== repo.id)]);
      onConnected();
    } catch (e: any) {
      setError(e?.message || `Could not link ${repo.full_name}.`);
    } finally {
      setConnectingId(null);
    }
  };

  if (!isOpen) return null;

  const installUrl = projectId
    ? `https://github.com/apps/kavach-security/installations/new?state=${encodeURIComponent(projectId)}`
    : 'https://github.com/apps/kavach-security/installations/new';

  return (
    <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.38)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="project-github-title" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 650px)', maxHeight: 'min(720px, 90vh)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 24px 70px rgba(15,23,42,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 22px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 id="project-github-title" style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>Connect a repository</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Choose a GitHub repository for <strong>{projectName}</strong>. Code security products use this same connection.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </header>

        {error && <div role="alert" style={{ padding: '10px 22px', background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{error}</div>}

        <div style={{ padding: 22, overflowY: 'auto' }}>
          {status?.configured === false ? (
            <div style={{ border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: 10, padding: 16, color: '#9a3412' }}>
              GitHub App is not configured for this Kavach environment. An administrator needs to configure it before repositories can be linked.
            </div>
          ) : !activeInstallationId && repositories.length === 0 ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 650, color: '#0f172a' }}>Install the Kavach GitHub App</div>
              <p style={{ margin: '6px 0 14px', fontSize: 13, lineHeight: 1.5, color: '#64748b' }}>Authorize the repositories you want Kavach to scan. After installation, you’ll return here to choose one.</p>
              <a href={installUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: '#0f172a', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Install GitHub App <ExternalLink size={15} />
              </a>
            </div>
          ) : (
            <>
              <label style={{ height: 40, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <Search size={16} color="#64748b" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories" aria-label="Search repositories" style={{ border: 0, outline: 0, flex: 1, fontSize: 13, color: '#0f172a' }} />
              </label>
              <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 9, overflow: 'hidden' }}>
                {loading ? <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}><Loader2 className="animate-spin" size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Loading repositories from GitHub…</div> : filtered.length ? filtered.map((repo) => {
                  const isLinked = linked.some((item) => item.github_repository_id === repo.id);
                  return <div key={repo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{repo.full_name}</div><div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{repo.default_branch || 'main'} · {repo.private ? 'Private' : 'Public'}</div></div>
                    {isLinked ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', color: '#15803d', fontSize: 12, fontWeight: 600 }}><Check size={15} /> Linked</span> : <button type="button" disabled={connectingId !== null} onClick={() => void handleLink(repo)} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 7, padding: '7px 12px', color: '#0f172a', cursor: connectingId === null ? 'pointer' : 'wait', fontSize: 12, fontWeight: 600 }}>{connectingId === repo.id ? 'Linking…' : 'Link'}</button>}
                  </div>;
                }) : <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>{query ? 'No repositories match that search.' : 'No repositories are available to this GitHub App installation.'}</div>}
              </div>
              {activeInstallationId && <a href={installUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: '#475569' }}>Manage GitHub App access <ExternalLink size={13} /></a>}
            </>
          )}
        </div>
        <footer style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>One repository connection is shared by SAST, secrets, dependency, container and API security.</footer>
      </section>
    </div>
  );
}
