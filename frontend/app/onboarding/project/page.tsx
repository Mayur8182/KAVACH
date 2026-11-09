'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Code2,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

const GithubSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

function OnboardingProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('org_id') || '';
  const workspaceId = searchParams?.get('workspace_id') || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('Web Application');
  const [repoUrl, setRepoUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');

  // GitHub Auto-detected Repositories state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing project data and automatically query GitHub integration repos
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Fetch GitHub status & repositories
      setLoadingRepos(true);
      try {
        const ghStatus = await api.integrations.getGithubStatus();
        if (isMounted && ghStatus?.connected) {
          setGithubConnected(true);
          setGithubLogin(ghStatus.login || null);

          const ghRepos = await api.integrations.getGithubRepos();
          if (isMounted && ghRepos?.repositories && ghRepos.repositories.length > 0) {
            setUserRepos(ghRepos.repositories);
            const first = ghRepos.repositories[0];
            setName(first.name);
            setRepoUrl(first.html_url);
            setDefaultBranch(first.default_branch || 'main');
            if (first.description) {
              setDescription(first.description);
            }
          }
        }
      } catch (err) {
        console.warn('Could not auto-fetch GitHub repos:', err);
      } finally {
        if (isMounted) setLoadingRepos(false);
      }

      // 2. Prefill existing project if any
      try {
        const prj = await api.onboarding.getProject();
        if (isMounted && prj) {
          if (prj.name) setName(prj.name);
          if (prj.description) setDescription(prj.description);
          if (prj.project_type) setProjectType(prj.project_type);
          if (prj.repo_url) setRepoUrl(prj.repo_url);
          if (prj.default_branch) setDefaultBranch(prj.default_branch);
        }
      } catch (err) {
        console.warn('Could not prefill project:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectRepo = (selectedFullName: string) => {
    const found = userRepos.find((r) => r.full_name === selectedFullName || r.name === selectedFullName);
    if (found) {
      setName(found.name);
      setRepoUrl(found.html_url);
      setDefaultBranch(found.default_branch || 'main');
      if (found.description) setDescription(found.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.onboarding.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
        repo_url: repoUrl.trim() || undefined,
        default_branch: defaultBranch.trim() || 'main',
        organization_id: orgId || undefined,
        workspace_id: workspaceId || undefined,
      });

      if (res?.id && typeof window !== 'undefined') {
        localStorage.setItem('secu_active_project_id', res.id);
        localStorage.setItem('secu_active_project_name', res.name || name.trim());
        if (workspaceId) {
          localStorage.setItem('secu_active_workspace_id', workspaceId);
        }
      }

      const q = new URLSearchParams();
      if (orgId) q.set('org_id', orgId);
      if (workspaceId) q.set('workspace_id', workspaceId);
      if (res?.id) q.set('project_id', res.id);

      router.push(`/onboarding/environment${q.toString() ? '?' + q.toString() : ''}`);
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err?.message || 'Failed to create project. Please verify the repository configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={3}
      title="Create Your First Project"
      subtitle="A project is your application or system that you want to secure."
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '20px' }}>
            Project Details
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Project Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Project Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Project Type */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Project Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    padding: '9px 32px 9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Web Application">Web Application</option>
                  <option value="API / Microservice">API / Microservice</option>
                  <option value="Mobile Application">Mobile Application</option>
                  <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  <option value="Machine Learning Model">Machine Learning Model</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            </div>

            {/* GitHub Repository Connection & Selector */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Git Repository
                </label>
                {githubConnected && (
                  <button
                    type="button"
                    onClick={() => setManualMode(!manualMode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {manualMode ? '← Pick from connected GitHub repos' : 'Enter URL manually'}
                  </button>
                )}
              </div>

              {loadingRepos ? (
                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                  <RefreshCw size={14} className="animate-spin" color="#2563EB" />
                  Loading your GitHub repositories...
                </div>
              ) : githubConnected && !manualMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Account Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                      <CheckCircle2 size={15} color="#16A34A" />
                      <span>Connected as <strong>@{githubLogin || 'GitHub User'}</strong></span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 500 }}>{userRepos.length} repositories found</span>
                  </div>

                  {/* Repository Select Dropdown */}
                  {userRepos.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <FolderGit2 size={15} color="#2563EB" />
                      </div>
                      <select
                        value={userRepos.find((r) => r.html_url === repoUrl)?.full_name || ''}
                        onChange={(e) => handleSelectRepo(e.target.value)}
                        style={{
                          width: '100%',
                          appearance: 'none',
                          padding: '10px 32px 10px 36px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <option value="" disabled>Select a repository to secure</option>
                        {userRepos.map((repo) => (
                          <option key={repo.id} value={repo.full_name}>
                            {repo.full_name} {repo.private ? '(Private)' : '(Public)'} · {repo.default_branch}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
                    </div>
                  ) : (
                    <div style={{ padding: '10px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '12px', color: '#B45309' }}>
                      No repositories found under this account. Please enter your repository URL below.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!githubConnected && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1E40AF' }}>
                        <Sparkles size={14} color="#2563EB" />
                        <span>Sign in with GitHub to auto-load your repositories</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.auth.getGithubAuthUrl();
                            if (res?.url) window.location.href = res.url;
                          } catch {
                            const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Ov23likjqoMrdpB35SRt';
                            const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback/github` : 'https://kavachsecurity.me/auth/callback/github'));
                            window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user,user:email,repo`;
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                        }}
                      >
                        <GithubSmallIcon />
                        Connect GitHub
                      </button>
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                      <GithubSmallIcon />
                    </div>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/organization/repository"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Default Branch */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Default Branch
              </label>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => router.push('/onboarding/workspace')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
                className="hover:bg-slate-50"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  backgroundColor: '#09090B',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
              >
                <span>{loading ? 'Creating...' : 'Next: Environment'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </div>
    </OnboardingLayout>
  );
}

export default function OnboardingProjectPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading project setup...</div>}>
      <OnboardingProjectContent />
    </Suspense>
  );
}
